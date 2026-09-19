import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side read models (RLS-scoped to the signed-in user).
 * Business logic lives in server functions / engines; these are display reads only.
 */

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const preferencesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["preferences", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("career_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const targetsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["targets", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("career_targets")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "removed")
        .order("kind");
      if (error) throw error;
      return data;
    },
  });

export const agentStateQuery = (userId: string) =>
  queryOptions({
    queryKey: ["agent-state", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_states").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const dashboardQuery = (userId: string) =>
  queryOptions({
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [matches, apps, interviews, activity] = await Promise.all([
        supabase
          .from("user_job_matches")
          .select("id, score, status, strengths, gaps, job:jobs(id, title, company, city, country, work_arrangement)")
          .eq("user_id", userId)
          .eq("eligible", true)
          .in("status", ["new", "viewed"])
          .gte("score", 80)
          .order("score", { ascending: false })
          .limit(5),
        supabase.from("applications").select("id, stage").eq("user_id", userId).is("deleted_at", null),
        supabase.from("interviews").select("id, scheduled_at").eq("user_id", userId).gte("scheduled_at", new Date().toISOString()),
        supabase
          .from("application_events")
          .select("id, description, event_type, actor, occurred_at")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(6),
      ]);
      const firstError = matches.error ?? apps.error ?? interviews.error ?? activity.error;
      if (firstError) throw firstError;
      const newToday = (matches.data ?? []).length;
      return {
        today,
        topMatches: matches.data ?? [],
        newMatchesCount: newToday,
        activeApplications: (apps.data ?? []).filter((a) => a.stage !== "closed").length,
        upcomingInterviews: (interviews.data ?? []).length,
        activity: activity.data ?? [],
      };
    },
  });

export const jobsFeedQuery = (userId: string, search: string) =>
  queryOptions({
    queryKey: ["jobs-feed", userId, search],
    queryFn: async () => {
      let q = supabase
        .from("user_job_matches")
        .select("id, score, status, strengths, gaps, job:jobs!inner(id, title, company, city, country, work_arrangement, posted_at, last_verified_at, status)")
        .eq("user_id", userId)
        .eq("eligible", true)
        .neq("status", "hidden")
        .order("score", { ascending: false })
        .limit(50);
      if (search.trim()) q = q.or(`title.ilike.%${search}%,company.ilike.%${search}%`, { referencedTable: "jobs" });
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

export const applicationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["applications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, stage, applied_at, created_at, mode, job:jobs(id, title, company, city, country)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const conversationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["conversations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, kind, last_message_at, created_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const cvsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["cvs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cvs")
        .select("id, title, kind, template, updated_at, job:jobs(title, company)")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("kind")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const masterCvQuery = (userId: string) =>
  queryOptions({
    queryKey: ["master-cv", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cvs")
        .select("id, title, updated_at, current_version_id, versions:cv_versions(id, version_no, label, file_path, file_type, parsed_data, analysis, created_at)")
        .eq("user_id", userId)
        .eq("kind", "master")
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const versions = [...(data.versions ?? [])].sort((a, b) => b.version_no - a.version_no);
      return { ...data, versions, current: versions.find((v) => v.id === data.current_version_id) ?? versions[0] ?? null };
    },
  });
