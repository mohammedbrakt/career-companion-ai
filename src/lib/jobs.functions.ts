/**
 * Job discovery + user job decisions (Interested / Save / Skip).
 * Client-safe module: only handler bodies run on the server.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const jobIdInput = z.object({ jobId: z.string().uuid() });

/** Recompute this user's match scores against the central jobs database. */
export const refreshMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { computeMatchesForUser } = await import("@/lib/matching/run.server");
    return computeMatchesForUser(context.supabase, context.userId);
  });

/**
 * Discovery: run the central collectors when the jobs database is stale,
 * then rescore for this user. Collection is central — never per user.
 */
export const discoverJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runIngestion } = await import("@/lib/jobs/ingest.server");
    const { computeMatchesForUser } = await import("@/lib/matching/run.server");

    const { data: recent } = await supabaseAdmin
      .from("jobs")
      .select("last_verified_at")
      .order("last_verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const stale =
      !recent?.last_verified_at || Date.now() - new Date(recent.last_verified_at).getTime() > 1000 * 60 * 60 * 6;

    const ingestion = stale ? await runIngestion(supabaseAdmin) : null;
    const matches = await computeMatchesForUser(context.supabase, context.userId);
    return { ingestion, matches };
  });

export const saveJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("saved_jobs").upsert({ user_id: userId, job_id: data.jobId }, { onConflict: "user_id,job_id" });
    return { ok: true };
  });

export const unsaveJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobIdInput.parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("saved_jobs").delete().eq("user_id", context.userId).eq("job_id", data.jobId);
    return { ok: true };
  });

/** Skip a job with a reason — the reason feeds the Career Brain. */
export const skipJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobIdInput.extend({ reason: z.string().min(1).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("hidden_jobs").upsert({ user_id: userId, job_id: data.jobId, reason: data.reason }, { onConflict: "user_id,job_id" });
    await supabase.from("user_job_matches").update({ status: "skipped" }).eq("user_id", userId).eq("job_id", data.jobId);
    await supabase.from("feedback_events").insert({ user_id: userId, job_id: data.jobId, kind: "job_rejected", reason: data.reason, details: {} });
    await supabase.from("career_memory").upsert(
      { user_id: userId, kind: "behavior", key: `rejected_reason:${data.reason}`, value: { reason: data.reason, last_at: new Date().toISOString() } as never, confidence: 0.6 },
      { onConflict: "user_id,kind,key" },
    );
    return { ok: true };
  });

/** Interested — creates the application record at the "interested" stage. Never applies. */
export const markInterested = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const match = await supabase
      .from("user_job_matches")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", data.jobId)
      .maybeSingle();

    const existing = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", data.jobId)
      .is("deleted_at", null)
      .maybeSingle();

    let applicationId = existing.data?.id ?? null;
    if (!applicationId) {
      const { data: created, error } = await supabase
        .from("applications")
        .insert({ user_id: userId, job_id: data.jobId, match_id: match.data?.id ?? null, stage: "interested", mode: "assisted" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      applicationId = created.id;
      await supabase.from("application_events").insert({
        user_id: userId,
        application_id: applicationId,
        event_type: "interested",
        actor: "user",
        description: "Marked interested",
        metadata: {},
      });
    }

    await supabase.from("user_job_matches").update({ status: "interested" }).eq("user_id", userId).eq("job_id", data.jobId);
    await supabase.from("feedback_events").insert({ user_id: userId, job_id: data.jobId, kind: "job_interested", details: {} });
    return { applicationId };
  });
