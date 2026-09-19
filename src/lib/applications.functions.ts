/**
 * Application Engine — prepares everything before the user has to act:
 * tailored CV, cover letter, application answers; then stage tracking.
 * Nothing is submitted without the user's approval.
 */
import { createServerFn } from "@tanstack/react-start";
import { streamText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayRunIdFetch, createResponsesProvider, MODELS } from "@/lib/ai-gateway.server";

const preparedSchema = z.object({
  summary: z.string(),
  headline: z.string(),
  highlighted_skills: z.array(z.string()),
  tailored_bullets: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  cover_letter: z.string(),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  notes_for_user: z.array(z.string()),
});

const PREPARE_SYSTEM = `You prepare a job application for a candidate, using ONLY their real CV data.

HARD RULES
- Never invent employers, dates, degrees, certifications, metrics or responsibilities. Rephrase and reorder only.
- Every tailored bullet must trace back to something in the candidate's CV.
- Emphasise the experience and skills the job actually asks for.
- Cover letter: short (max ~180 words), specific, no clichés, no "I am writing to apply".
- answers: the 2-4 questions this employer most likely asks, answered truthfully from the CV.
- notes_for_user: anything the candidate must check or add themselves (missing info, claims you could not support).
- Write everything in the same language as the job description.`;

const prepareInput = z.object({ applicationId: z.string().uuid() });

export const prepareApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prepareInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const app = await supabase
      .from("applications")
      .select("id, job_id, stage")
      .eq("id", data.applicationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!app.data) throw new Error("application_not_found");

    const [job, cv, profile] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", app.data.job_id).maybeSingle(),
      supabase.from("cvs").select("id, current_version_id").eq("user_id", userId).eq("kind", "master").is("deleted_at", null).maybeSingle(),
      supabase.from("profiles").select("full_name, headline, work_history, education, certifications, languages, industries, years_experience").eq("user_id", userId).maybeSingle(),
    ]);
    if (!job.data) throw new Error("job_not_found");
    if (!cv.data?.current_version_id) throw new Error("no_master_cv");

    const version = await supabase
      .from("cv_versions")
      .select("id, parsed_data")
      .eq("id", cv.data.current_version_id)
      .maybeSingle();
    if (!version.data?.parsed_data) throw new Error("no_master_cv");

    const lovable = createResponsesProvider(createLovableAiGatewayRunIdFetch());
    const result = streamText({
      model: lovable.responses(MODELS.reasoning),
      system: PREPARE_SYSTEM,
      prompt: `JOB
Title: ${job.data.title}
Company: ${job.data.company}
Location: ${[job.data.city, job.data.country].filter(Boolean).join(", ")}
Required skills: ${(job.data.required_skills ?? []).join(", ")}
Description:
${(job.data.description ?? "").slice(0, 6000)}

CANDIDATE MASTER CV (JSON, the only source of truth):
${JSON.stringify(version.data.parsed_data).slice(0, 14000)}

PROFILE:
${JSON.stringify(profile.data ?? {}).slice(0, 3000)}`,
      output: Output.object({ schema: preparedSchema }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });

    const prepared = (await result.output) as z.infer<typeof preparedSchema>;

    // Tailored CV, versioned and linked to the job.
    const tailoredTitle = `${job.data.title} — ${job.data.company}`;
    const existingTailored = await supabase
      .from("cvs")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "tailored")
      .eq("job_id", job.data.id)
      .is("deleted_at", null)
      .maybeSingle();

    let tailoredCvId = existingTailored.data?.id ?? null;
    if (!tailoredCvId) {
      const created = await supabase
        .from("cvs")
        .insert({ user_id: userId, title: tailoredTitle, kind: "tailored", job_id: job.data.id })
        .select("id")
        .single();
      if (created.error) throw new Error(created.error.message);
      tailoredCvId = created.id ? created.id : created.data.id;
    }

    const last = await supabase
      .from("cv_versions")
      .select("version_no")
      .eq("cv_id", tailoredCvId)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const versionNo = (last.data?.version_no ?? 0) + 1;

    const newVersion = await supabase
      .from("cv_versions")
      .insert({
        cv_id: tailoredCvId,
        user_id: userId,
        version_no: versionNo,
        label: `Tailored v${versionNo}`,
        content: { base_version_id: version.data.id, ...prepared } as never,
        created_by: "ai",
      })
      .select("id")
      .single();
    if (newVersion.error) throw new Error(newVersion.error.message);
    await supabase.from("cvs").update({ current_version_id: newVersion.data.id }).eq("id", tailoredCvId);

    await supabase
      .from("applications")
      .update({
        cv_version_id: newVersion.data.id,
        cover_letter: prepared.cover_letter,
        answers: prepared.answers as never,
        stage: app.data.stage === "interested" ? "approved" : app.data.stage,
      })
      .eq("id", app.data.id);

    await supabase.from("application_events").insert({
      user_id: userId,
      application_id: app.data.id,
      event_type: "prepared",
      actor: "agent",
      description: "Tailored CV, cover letter and answers prepared",
      metadata: { cv_version_id: newVersion.data.id } as never,
    });
    await supabase.from("analytics_events").insert({ user_id: userId, name: "application_prepared", properties: { application_id: app.data.id } as never });
    await supabase
      .from("agent_states")
      .upsert({ user_id: userId, state: "APPLICATION_READY", next_action: { action: "review_application", application_id: app.data.id } as never }, { onConflict: "user_id" });

    return { prepared, cvVersionId: newVersion.data.id };
  });

const stageInput = z.object({
  applicationId: z.string().uuid(),
  stage: z.enum(["found", "interested", "approved", "applied", "viewed", "interview", "offer", "closed"]),
  note: z.string().max(500).nullable(),
  closedReason: z.enum(["rejected", "withdrawn", "job_closed", "user_declined"]).nullable(),
});

export const setApplicationStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => stageInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { stage: data.stage };
    if (data.stage === "applied") patch["applied_at"] = new Date().toISOString();
    if (data.stage === "closed" && data.closedReason) patch["closed_reason"] = data.closedReason;

    const updated = await supabase.from("applications").update(patch as never).eq("id", data.applicationId).eq("user_id", userId).select("id, job_id").maybeSingle();
    if (updated.error) throw new Error(updated.error.message);
    if (!updated.data) throw new Error("application_not_found");

    const employerStages = new Set(["viewed", "interview", "offer"]);
    await supabase.from("application_events").insert({
      user_id: userId,
      application_id: data.applicationId,
      event_type: `stage:${data.stage}`,
      actor: employerStages.has(data.stage) ? "employer" : "user",
      description: data.note ?? `Moved to ${data.stage}`,
      metadata: {} as never,
    });

    const analyticsName =
      data.stage === "applied" ? "application_submitted" : data.stage === "interview" ? "interview_added" : data.stage === "offer" ? "offer_received" : null;
    if (analyticsName) {
      await supabase.from("analytics_events").insert({ user_id: userId, name: analyticsName, properties: { application_id: data.applicationId } as never });
    }
    if (data.stage === "interview") {
      await supabase.from("interviews").insert({ user_id: userId, application_id: data.applicationId, kind: "unspecified" });
    }
    return { ok: true };
  });

/** Interview Coach — likely questions and preparation for one application. */
const prepSchema = z.object({
  questions: z.array(z.object({ question: z.string(), why: z.string(), strong_answer_outline: z.string() })),
  gaps_to_address: z.array(z.string()),
  company_notes: z.array(z.string()),
  star_practice: z.array(z.string()),
});

export const prepareInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => prepareInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const app = await supabase.from("applications").select("id, job_id").eq("id", data.applicationId).eq("user_id", userId).maybeSingle();
    if (!app.data) throw new Error("application_not_found");

    const [job, profile] = await Promise.all([
      supabase.from("jobs").select("title, company, description, required_skills").eq("id", app.data.job_id).maybeSingle(),
      supabase.from("profiles").select("work_history, education, industries, years_experience, headline").eq("user_id", userId).maybeSingle(),
    ]);

    const lovable = createResponsesProvider(createLovableAiGatewayRunIdFetch());
    const result = streamText({
      model: lovable.responses(MODELS.reasoning),
      system:
        "You are an interview coach. Use only the candidate's real background. Be specific to this job and company. Write in the language of the job description. Outlines are short and practical, never generic advice.",
      prompt: `JOB: ${JSON.stringify(job.data).slice(0, 8000)}\n\nCANDIDATE: ${JSON.stringify(profile.data).slice(0, 8000)}`,
      output: Output.object({ schema: prepSchema }),
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] },
      },
    });
    const prep = (await result.output) as z.infer<typeof prepSchema>;

    const existing = await supabase.from("interviews").select("id").eq("application_id", data.applicationId).eq("user_id", userId).limit(1).maybeSingle();
    if (existing.data) {
      await supabase.from("interviews").update({ prep: prep as never }).eq("id", existing.data.id);
    } else {
      await supabase.from("interviews").insert({ user_id: userId, application_id: data.applicationId, prep: prep as never, kind: "prep" });
    }
    await supabase
      .from("agent_states")
      .upsert({ user_id: userId, state: "INTERVIEW_PREP", next_action: { action: "practice_interview", application_id: data.applicationId } as never }, { onConflict: "user_id" });

    return prep;
  });
