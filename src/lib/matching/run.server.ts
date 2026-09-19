/**
 * Matching runner — computes and caches user_job_matches for one user.
 * Scoring itself is pure (engine.server.ts); this only handles IO.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { scoreJob, type MatchContext } from "./engine.server";

type DB = SupabaseClient<Database>;

export async function loadMatchContext(supabase: DB, userId: string): Promise<MatchContext> {
  const [profile, prefs, skills, targets] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("career_preferences").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("user_skills").select("name").eq("user_id", userId),
    supabase.from("career_targets").select("title").eq("user_id", userId).neq("status", "removed"),
  ]);
  return {
    profile: profile.data,
    preferences: prefs.data,
    skills: (skills.data ?? []).map((s) => s.name),
    targets: (targets.data ?? []).map((t) => t.title),
    locale: (profile.data?.locale === "en" ? "en" : "ar") as "ar" | "en",
  };
}

export async function computeMatchesForUser(supabase: DB, userId: string, limit = 250) {
  const ctx = await loadMatchContext(supabase, userId);
  const [{ data: jobs }, { data: hidden }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .in("status", ["active", "possibly_active"])
      .order("posted_at", { ascending: false })
      .limit(limit),
    supabase.from("hidden_jobs").select("job_id").eq("user_id", userId),
  ]);
  const hiddenIds = new Set((hidden ?? []).map((h) => h.job_id));
  if (!jobs || jobs.length === 0) return { scored: 0, strong: 0 };

  const now = new Date().toISOString();
  const rows = jobs
    .filter((job) => !hiddenIds.has(job.id))
    .map((job) => {
      const result = scoreJob(job, ctx);
      return {
        user_id: userId,
        job_id: job.id,
        score: result.score,
        eligible: result.eligible,
        ineligibility_reasons: result.ineligibility_reasons,
        breakdown: result.breakdown as never,
        strengths: result.strengths,
        gaps: result.gaps,
        recommendation: result.recommendation,
        computed_at: now,
        updated_at: now,
      };
    });

  // Keep user decisions: only refresh scoring columns, never overwrite status.
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await supabase.from("user_job_matches").upsert(chunk, { onConflict: "user_id,job_id", ignoreDuplicates: false });
  }

  return { scored: rows.length, strong: rows.filter((r) => r.eligible && r.score >= 80).length };
}
