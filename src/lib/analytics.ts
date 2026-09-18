import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "signup_completed"
  | "cv_uploaded"
  | "cv_created"
  | "profile_completed"
  | "job_viewed"
  | "job_saved"
  | "job_rejected"
  | "job_interested"
  | "application_prepared"
  | "application_approved"
  | "application_submitted"
  | "interview_added"
  | "offer_received"
  | "subscription_started"
  | "subscription_cancelled";

/** Fire-and-forget product analytics (stored in analytics_events). */
export async function track(name: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("analytics_events").insert({ user_id: data.user.id, name, properties });
  } catch (e) {
    console.warn("analytics failed", e);
  }
}
