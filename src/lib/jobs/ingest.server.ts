/**
 * CJDE — Ingestion pipeline.
 * Sources -> Collectors -> Normalization -> Deduplication -> Validation -> Central jobs DB.
 * Runs once centrally (never per user), so hundreds of users never re-analyse the same job.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { COLLECTORS, type CollectorContext } from "./collectors.server";
import { normalizeJob, type NormalizedJob } from "./normalize.server";

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
  if (!job.description || job.description.length < 120) return false;
  if (!job.application_url) return false;
  if (job.posted_at) {
    const age = Date.now() - new Date(job.posted_at).getTime();
    if (age > 1000 * 60 * 60 * 24 * 90) return false; // older than 90 days
  }
  return true;
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

export async function runIngestion(admin: DB, collectorKeys?: string[]): Promise<IngestResult> {
  const ctx = await buildContext(admin);
  const result: IngestResult = { collected: 0, inserted: 0, duplicates: 0, rejected: 0, expired: 0, perSource: {} };
  const collectors = collectorKeys?.length ? COLLECTORS.filter((c) => collectorKeys.includes(c.key)) : COLLECTORS;
  const now = new Date().toISOString();

  for (const collector of collectors) {
    let raws: Awaited<ReturnType<typeof collector.collect>> = [];
    let status = "ok";
    try {
      raws = await collector.collect(ctx);
    } catch (error) {
      status = error instanceof Error ? error.message.slice(0, 200) : "failed";
    }
    result.collected += raws.length;
    result.perSource[collector.key] = raws.length;

    // Register the collector row (swappable provider registry).
    const { data: collectorRow } = await admin
      .from("job_collectors")
      .upsert(
        { name: collector.name, kind: collector.kind, is_active: true, last_run_at: now, last_status: status, config: { key: collector.key }, stats: { last_collected: raws.length } },
        { onConflict: "name" },
      )
      .select("id")
      .maybeSingle();

    for (const raw of raws) {
      const job = normalizeJob(raw);
      if (!isValid(job)) {
        result.rejected++;
        continue;
      }

      // Deduplication — one canonical job record, many sources.
      const existing = await admin.from("jobs").select("id").eq("fingerprint", job.fingerprint).maybeSingle();
      let jobId = existing.data?.id ?? null;

      if (jobId) {
        result.duplicates++;
        await admin.from("jobs").update({ last_verified_at: now, status: "active" }).eq("id", jobId);
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
  }

  result.expired = await expireStaleJobs(admin);
  await admin.from("system_logs").insert({
    level: "info",
    source: "cjde.ingestion",
    message: `Ingestion run: ${result.inserted} new, ${result.duplicates} duplicates, ${result.rejected} rejected`,
    context: result as never,
  });
  return result;
}
