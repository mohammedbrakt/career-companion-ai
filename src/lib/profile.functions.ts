import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Approve or remove an AI-proposed target role. */
export const setTargetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { targetId: string; status: "approved" | "removed" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("career_targets")
      .update({ status: data.status })
      .eq("id", data.targetId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** User-controlled automation level for applications. */
export const setApplicationPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { permission: "approval_required" | "trusted_auto" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("career_preferences")
      .update({ application_permission: data.permission })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
