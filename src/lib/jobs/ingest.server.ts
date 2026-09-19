/**
 * CJDE — Ingestion pipeline.
 * Sources -> Collectors -> Normalization -> Deduplication -> Validation -> Central jobs DB.
 * Runs once centrally (never per user), so hundreds of users never re-analyse the same job.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { activeCollectors, COLLECTORS, type CollectorContext } from "./collectors.server";
import { normalizeJob, type NormalizedJob } from "./normalize.server";
import { relevanceScore } from "./expand.server";

type DB = SupabaseClient<Database>;

export type IngestResult = {
  collected: number;
  inserted: number;
  duplicates: number;
  rejected: number;
  expired: number;
  perSource: Record<string, number>;
};

/** Validation — a job must be complete and plausible enough to show to a human. */
function isValid(job: NormalizedJob): boolean {
  if (job.title.length < 3 || job.company.length < 2) return false;
  if (!job.description || job.description.length < 60) return false;
  if (!job.application_url) return false;
  if (job.posted_at) {
    const age = Date.now() - new Date(job.posted_at).getTime();
    if (age > 1000 * 60 * 60 * 24 * 90) return false; // older than 90 days
  }
  return true;
}

const DIRECT_ATS_HOSTS = ["greenhouse.io", "lever.co", "workable.com", "ashbyhq.com"];

function isDirectAts(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DIRECT_ATS_HOSTS.some((a) => host.endsWith(a));
  } catch {
    return false;
  }
}

/**
 * Boards hand out their own redirect links (remotive.com/…, jobicy.com/…), which
 * hide the employer's real system (often Greenhouse or Lever). Following the
 * redirect once at collection time is what makes true one-click apply visible.
 */
async function resolveRedirect(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; ShoghlniBot/1.0; +https://shoghlni.app)" },
    });
    if (res.url && res.url.startsWith("http")) return res.url;
  } catch {
    // Network hiccups keep the original link — never worse than before.
  } finally {
    clearTimeout(timer);
  }
  return url;
}

/** Resolve redirect links to their final destination, a small pool at a time. */
async function resolveApplicationUrls(urls: string[], maxResolves = 120): Promise<Map<string, string>> {
  const targets = [...new Set(urls.filter((u) => u && !isDirectAts(u)))].slice(0, maxResolves);
  const resolved = new Map<string, string>();
  const CONCURRENCY = 10;
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < targets.length) {
        const url = targets[next++]!;
        const final = await resolveRedirect(url);
        if (final !== url) resolved.set(url, final);
      }
    }),
  );
  return resolved;
}

async function buildContext(admin: DB): Promise<CollectorContext> {
  const [targets, prefs] = await Promise.all([
    admin.from("career_targets").select("title").neq("status", "removed").limit(200),
    admin.from("career_preferences").select("target_countries").limit(500),
  ]);
  const queries = [...new Set((targets.data ?? []).map((t) => t.title.trim()).filter(Boolean))].slice(0, 8);
  const countries = [...new Set((prefs.data ?? []).flatMap((p) => p.target_countries ?? []))];
  return {
    queries: queries.length > 0 ? queries : ["operations manager", "sales manager", "accountant", "software engineer", "marketing"],
    countries,
    limit: 40,
  };
}

/** Freshness: anything not seen for 30 days is marked expired, so nothing stale looks fresh. */
async function expireStaleJobs(admin: DB): Promise<number> {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const { data } = await admin
    .from("jobs")
    .update({ status: "expired" })
    .lt("last_verified_at", cutoff)
    .in("status", ["active", "possibly_active"])
    .select("id");
  return data?.length ?? 0;
}

export async function runIngestion(admin: DB, collectorKeys?: string[], ctxOverride?: Partial<CollectorContext>): Promise<IngestResult> {
  const base = await buildContext(admin);
  const ctx: CollectorContext = {
    queries: ctxOverride?.queries?.length ? ctxOverride.queries : base.queries,
    countries: ctxOverride?.countries ?? base.countries,
    limit: ctxOverride?.limit ?? base.limit,
    strict: ctxOverride?.strict ?? false,
  };
  const result: IngestResult = { collected: 0, inserted: 0, duplicates: 0, rejected: 0, expired: 0, perSource: {} };
  const collectors = collectorKeys?.length
    ? COLLECTORS.filter((c) => collectorKeys.includes(c.key) && (c.isEnabled ? c.isEnabled() : true))
    : activeCollectors();
  const now = new Date().toISOString();

  // All sources are queried at once — a deep search must not wait for them one by one.
  const harvest = await Promise.all(
    collectors.map(async (collector) => {
      try {
        return { collector, raws: await collector.collect(ctx), status: "ok" };
      } catch (error) {
        return {
          collector,
          raws: [] as Awaited<ReturnType<typeof collector.collect>>,
          status: error instanceof Error ? error.message.slice(0, 200) : "failed",
        };
      }
    }),
  );

  // Normalize + validate everything first, then resolve redirect links once —
  // so dedupe and insertion all use the employer's real application URL.
  const pending = harvest.flatMap(({ collector, raws }) =>
    raws
      .map((raw) => ({ collector, raw, job: normalizeJob(raw) }))
      .filter(({ job }) => {
        if (!isValid(job)) {
          result.rejected++;
          return false;
        }
        // Relevance gate: in a targeted (deep) search, a posting must actually
        // answer one of the searched roles, not merely come back from the board.
        if (ctx.strict && relevanceScore(job.title, ctx.queries) < 0.5) {
          result.rejected++;
          return false;
        }
        return true;
      }),
  );
  const resolvedUrls = await resolveApplicationUrls(pending.map(({ job }) => job.application_url).filter((u): u is string => Boolean(u)));

  for (const { collector, raw, job: normalized } of pending) {
    const finalUrl = resolvedUrls.get(normalized.application_url!) ?? normalized.application_url;
    const job = finalUrl !== normalized.application_url ? { ...normalized, application_url: finalUrl } : normalized;
    result.collected++;
    result.perSource[collector.key] = (result.perSource[collector.key] ?? 0) + 1;

    // Register the collector row (swappable provider registry).
    const { data: collectorRow } = await admin
      .from("job_collectors")
      .upsert(
        { name: collector.name, kind: collector.kind, is_active: true, last_run_at: now, last_status: "ok", config: { key: collector.key }, stats: { last_collected: result.perSource[collector.key] } },
        { onConflict: "name" },
      )
      .select("id")
      .maybeSingle();

    // Deduplication — one canonical job record, many sources.
    const existing = await admin.from("jobs").select("id, application_url").eq("fingerprint", job.fingerprint).maybeSingle();
    let jobId = existing.data?.id ?? null;

    if (jobId) {
      result.duplicates++;
      const urlChanged = job.application_url !== existing.data?.application_url;
      await admin
        .from("jobs")
        .update(urlChanged ? { last_verified_at: now, status: "active", application_url: job.application_url } : { last_verified_at: now, status: "active" })
        .eq("id", jobId);
    } else {
      const { data: created, error } = await admin
        .from("jobs")
        .insert({
          ...job,
          raw: job.raw as never,
          status: "active",
          last_verified_at: now,
          posted_at: job.posted_at ?? now,
        })
        .select("id")
        .maybeSingle();
      if (error || !created) {
        result.rejected++;
        continue;
      }
      jobId = created.id;
      result.inserted++;
      const skillRows = [
        ...job.required_skills.map((name) => ({ job_id: jobId!, name, normalized_name: name.toLowerCase(), required: true })),
        ...job.preferred_skills.map((name) => ({ job_id: jobId!, name, normalized_name: name.toLowerCase(), required: false })),
      ];
      if (skillRows.length > 0) await admin.from("job_skills").insert(skillRows);
    }

    await admin.from("job_sources").upsert(
      {
        job_id: jobId,
        collector_id: collectorRow?.id ?? null,
        source_name: raw.source_name,
        source_url: raw.source_url ?? null,
        external_ref: raw.external_ref,
        last_seen_at: now,
      },
      { onConflict: "source_name,external_ref" },
    );
  }

  result.expired = await expireStaleJobs(admin);
  await admin.from("system_logs").insert({
    level: "info",
    area: "cjde.ingestion",
    message: `Ingestion run: ${result.inserted} new, ${result.duplicates} duplicates, ${result.rejected} rejected`,
    metadata: result as never,
  });
  return result;
}
