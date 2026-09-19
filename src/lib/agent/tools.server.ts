/**
 * Agent tool layer — the only way the agent touches user data.
 * Every tool runs against an RLS-scoped Supabase client for the signed-in user.
 */
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

const JOB_FIELDS =
  "id, title, company, company_logo_url, industry, country, city, work_arrangement, employment_type, seniority, salary_min, salary_max, salary_currency, description, responsibilities, required_skills, preferred_skills, min_years_experience, education_requirements, languages_required, application_url, status, posted_at, last_verified_at";

function ok<T>(data: T) {
  return { ok: true as const, data };
}
function fail(message: string) {
  return { ok: false as const, error: message };
}

export function createAgentTools(supabase: DB, userId: string) {
  return {
    get_master_cv: tool({
      description:
        "Read the user's Master CV: the parsed structured CV data and the AI review (strengths, gaps, ATS issues, open questions). Use it before discussing or tailoring the CV. Never invent CV content that is not here.",
      inputSchema: z.object({}),
      execute: async () => {
        const cv = await supabase
          .from("cvs")
          .select("id, title, current_version_id")
          .eq("user_id", userId)
          .eq("kind", "master")
          .is("deleted_at", null)
          .maybeSingle();
        if (!cv.data) return ok({ has_cv: false, next_step: "Ask the user to upload their CV on the CV page, or build one together." });

        const version = await supabase
          .from("cv_versions")
          .select("id, version_no, parsed_data, analysis, created_at")
          .eq("cv_id", cv.data.id)
          .order("version_no", { ascending: false })
          .limit(1)
          .maybeSingle();
        return ok({ has_cv: true, cv_id: cv.data.id, version: version.data });
      },
    }),

    get_career_profile: tool({
      description: "Read the user's career profile, preferences, targets, skills and remembered facts. Call before asking for information.",
      inputSchema: z.object({}),
      execute: async () => {
        const [profile, prefs, targets, skills, memory, cvs] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("career_preferences").select("*").eq("user_id", userId).maybeSingle(),
          supabase.from("career_targets").select("title, kind, status, rationale").eq("user_id", userId).neq("status", "removed"),
          supabase.from("user_skills").select("name, level, years").eq("user_id", userId),
          supabase.from("career_memory").select("kind, key, value").eq("user_id", userId),
          supabase.from("cvs").select("id, title, kind, created_at").eq("user_id", userId).is("deleted_at", null),
        ]);
        return ok({
          profile: profile.data,
          preferences: prefs.data,
          targets: targets.data ?? [],
          skills: skills.data ?? [],
          memory: memory.data ?? [],
          cvs: cvs.data ?? [],
        });
      },
    }),

    update_career_profile: tool({
      description:
        "Update confirmed profile facts. Only write what the user told you or what came from their CV. Never invent values. Pass null for fields you are not changing.",
      inputSchema: z.object({
        full_name: z.string().nullable(),
        headline: z.string().nullable(),
        current_title: z.string().nullable(),
        country: z.string().nullable(),
        city: z.string().nullable(),
        years_experience: z.number().nullable(),
        seniority: z.enum(["intern", "junior", "mid", "senior", "lead", "manager", "director", "executive"]).nullable(),
        track: z.enum(["experienced", "fresh_graduate"]).nullable(),
        industries: z.array(z.string()).nullable(),
      }),
      execute: async (input) => {
        const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null));
        if (Object.keys(patch).length === 0) return fail("Nothing to update.");
        const { error } = await supabase.from("profiles").update(patch as never).eq("user_id", userId);
        if (error) return fail(error.message);
        return ok({ updated: Object.keys(patch) });
      },
    }),

    set_career_preferences: tool({
      description: "Save job-search preferences the user confirmed. Pass null for anything unchanged.",
      inputSchema: z.object({
        target_countries: z.array(z.string()).nullable(),
        target_cities: z.array(z.string()).nullable(),
        work_arrangements: z.array(z.enum(["remote", "hybrid", "onsite"])).nullable(),
        employment_types: z.array(z.enum(["full_time", "part_time", "contract", "internship", "temporary", "freelance"])).nullable(),
        target_industries: z.array(z.string()).nullable(),
        salary_min: z.number().nullable(),
        salary_max: z.number().nullable(),
        salary_currency: z.string().nullable(),
        relocation_willing: z.boolean().nullable(),
      }),
      execute: async (input) => {
        const patch = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null));
        if (Object.keys(patch).length === 0) return fail("Nothing to update.");
        const { error } = await supabase.from("career_preferences").upsert({ user_id: userId, ...patch } as never, { onConflict: "user_id" });
        if (error) return fail(error.message);
        return ok({ updated: Object.keys(patch) });
      },
    }),

    propose_target_roles: tool({
      description:
        "Record target roles. Use 'primary' for the role they want most and 'secondary' for adjacent roles their experience supports. Status 'suggested' until the user approves.",
      inputSchema: z.object({
        roles: z.array(
          z.object({
            title: z.string(),
            kind: z.enum(["primary", "secondary"]),
            status: z.enum(["suggested", "approved"]),
            rationale: z.string().nullable(),
          }),
        ),
      }),
      execute: async ({ roles }) => {
        if (roles.length === 0) return fail("No roles given.");
        const { error } = await supabase
          .from("career_targets")
          .insert(roles.map((r) => ({ user_id: userId, title: r.title, kind: r.kind, status: r.status, rationale: r.rationale })));
        if (error) return fail(error.message);
        return ok({ saved: roles.length });
      },
    }),

    remember_fact: tool({
      description:
        "Store something durable in the Career Brain so you never ask again: a fact, a preference, or an observed behaviour. Use a short stable key.",
      inputSchema: z.object({
        kind: z.enum(["fact", "preference", "behavior"]),
        key: z.string(),
        value: z.string(),
      }),
      execute: async ({ kind, key, value }) => {
        const { error } = await supabase
          .from("career_memory")
          .upsert({ user_id: userId, kind, key, value, source: "agent" }, { onConflict: "user_id,kind,key" });
        if (error) return fail(error.message);
        return ok({ remembered: key });
      },
    }),

    search_jobs: tool({
      description:
        "Search the verified central jobs database, newest first, with the user's match score when it has been computed. Pass null to skip a filter.",
      inputSchema: z.object({
        query: z.string().nullable(),
        country: z.string().nullable(),
        city: z.string().nullable(),
        work_arrangement: z.enum(["remote", "hybrid", "onsite"]).nullable(),
        min_score: z.number().nullable(),
        limit: z.number().nullable(),
      }),
      execute: async ({ query, country, city, work_arrangement, min_score, limit }) => {
        let q = supabase
          .from("jobs")
          .select("id, title, company, country, city, work_arrangement, seniority, salary_min, salary_max, salary_currency, posted_at, status")
          .in("status", ["active", "possibly_active"])
          .order("posted_at", { ascending: false })
          .limit(Math.min(limit ?? 8, 15));
        if (query) q = q.or(`title.ilike.%${query}%,company.ilike.%${query}%`);
        if (country) q = q.ilike("country", country);
        if (city) q = q.ilike("city", city);
        if (work_arrangement) q = q.eq("work_arrangement", work_arrangement);
        const { data: jobs, error } = await q;
        if (error) return fail(error.message);
        if (!jobs || jobs.length === 0) return ok({ jobs: [], note: "No verified jobs matched. The discovery engine may not have collected for this search yet." });

        const { data: matches } = await supabase
          .from("user_job_matches")
          .select("job_id, score, strengths, gaps, eligible")
          .eq("user_id", userId)
          .in("job_id", jobs.map((j) => j.id));
        const byJob = new Map((matches ?? []).map((m) => [m.job_id, m]));
        const merged = jobs
          .map((j) => ({ ...j, match: byJob.get(j.id) ?? null }))
          .filter((j) => (min_score == null ? true : (j.match?.score ?? 0) >= min_score));
        return ok({ jobs: merged });
      },
    }),

    get_job_details: tool({
      description: "Full detail for one job plus the user's match breakdown, strengths and gaps.",
      inputSchema: z.object({ job_id: z.string() }),
      execute: async ({ job_id }) => {
        const { data: job, error } = await supabase.from("jobs").select(JOB_FIELDS).eq("id", job_id).maybeSingle();
        if (error) return fail(error.message);
        if (!job) return fail("Job not found.");
        const { data: match } = await supabase
          .from("user_job_matches")
          .select("score, eligible, ineligibility_reasons, breakdown, strengths, gaps, recommendation, status")
          .eq("user_id", userId)
          .eq("job_id", job_id)
          .maybeSingle();
        return ok({ job, match });
      },
    }),

    save_job: tool({
      description: "Save a job for later.",
      inputSchema: z.object({ job_id: z.string() }),
      execute: async ({ job_id }) => {
        const { error } = await supabase.from("saved_jobs").upsert({ user_id: userId, job_id });
        if (error) return fail(error.message);
        return ok({ saved: job_id });
      },
    }),

    hide_job: tool({
      description: "Hide a job the user is not interested in and record the reason so recommendations improve.",
      inputSchema: z.object({ job_id: z.string(), reason: z.string().nullable() }),
      execute: async ({ job_id, reason }) => {
        const { error } = await supabase.from("hidden_jobs").upsert({ user_id: userId, job_id, reason });
        if (error) return fail(error.message);
        await supabase.from("user_job_matches").update({ status: "skipped" }).eq("user_id", userId).eq("job_id", job_id);
        await supabase.from("feedback_events").insert({ user_id: userId, job_id, kind: "job_rejected", reason });
        return ok({ hidden: job_id });
      },
    }),

    mark_interested: tool({
      description:
        "Mark a job as Interested. This creates a tracked application at the 'interested' stage. It does NOT apply — applying always needs separate explicit approval.",
      inputSchema: z.object({ job_id: z.string() }),
      execute: async ({ job_id }) => {
        await supabase.from("user_job_matches").update({ status: "interested" }).eq("user_id", userId).eq("job_id", job_id);
        const { data: app, error } = await supabase
          .from("applications")
          .upsert({ user_id: userId, job_id, stage: "interested" }, { onConflict: "user_id,job_id" })
          .select("id")
          .single();
        if (error) return fail(error.message);
        await supabase.from("application_events").insert({
          application_id: app.id,
          user_id: userId,
          actor: "agent",
          event_type: "stage_changed",
          description: "Marked as interested; application tracking started.",
        });
        await supabase.from("feedback_events").insert({ user_id: userId, job_id, kind: "job_interested" });
        return ok({ application_id: app.id });
      },
    }),

    get_applications: tool({
      description: "List the user's tracked applications with their current stage.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabase
          .from("applications")
          .select("id, stage, mode, applied_at, next_follow_up_at, created_at, jobs(title, company, country, city)")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(25);
        if (error) return fail(error.message);
        return ok({ applications: data ?? [] });
      },
    }),

    set_agent_state: tool({
      description: "Move the agent's stage for this user when the conversation genuinely progresses.",
      inputSchema: z.object({
        state: z.enum([
          "NEW_USER",
          "ONBOARDING",
          "WAITING_FOR_CV",
          "CV_ANALYSIS",
          "PROFILE_REVIEW",
          "READY_TO_SEARCH",
          "JOB_DISCOVERY",
          "JOB_REVIEW",
          "JOB_INTERESTED",
          "CV_TAILORING",
          "APPLICATION_READY",
          "APPLICATION_PROCESS",
          "INTERVIEW_PREP",
        ]),
        next_action_label: z.string().nullable(),
      }),
      execute: async ({ state, next_action_label }) => {
        const { error } = await supabase
          .from("agent_states")
          .upsert({ user_id: userId, state, next_action: next_action_label ? { label: next_action_label } : null }, { onConflict: "user_id" });
        if (error) return fail(error.message);
        return ok({ state });
      },
    }),
  };
}
