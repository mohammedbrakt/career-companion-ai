import { createServerFn } from "@tanstack/react-start";
import { streamText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createResponsesProvider, MODELS, getLovableApiKey } from "@/lib/ai-gateway.server";
import { clampCvText, extractDocumentText, UnsupportedCvFileError } from "@/lib/cv/extract.server";
import { computeProfileStrength, parsedCvSchema, type ParsedCv } from "@/lib/cv/schema";

const PARSE_SYSTEM = `You extract structured data from a candidate CV for a career agent.

HARD RULES
- Extract ONLY what the document states. Never invent skills, companies, dates, degrees, certifications, metrics or achievements.
- Unknown value => null (or an empty list). Never guess.
- Keep the wording of achievements close to the original; you may clean grammar and formatting only.
- years_experience: compute from the dated work history when possible, otherwise null.
- analysis.missing_questions: the few most useful questions to ask the candidate about information the CV does not contain.
- analysis lists: concrete, specific, short. ATS issues, weak/generic bullets, missing metrics, missing sections, positioning.
- Write analysis text in the same language as the CV.`;

async function parseCvText(rawText: string): Promise<ParsedCv> {
  const key = getLovableApiKey();
  const lovable = createResponsesProvider(key);

  const result = streamText({
    model: lovable.responses(MODELS.reasoning),
    system: PARSE_SYSTEM,
    prompt: `CV DOCUMENT:\n\n${rawText}`,
    output: Output.object({ schema: parsedCvSchema }),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  return (await result.output) as ParsedCv;
}

const ParseInput = z.object({
  filePath: z.string().min(1),
  fileType: z.string(),
  fileName: z.string(),
});

/** Upload -> extract -> AI parse -> store a new Master CV version. No profile writes yet. */
export const parseCvUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ParseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const download = await supabase.storage.from("cvs").download(data.filePath);
    if (download.error || !download.data) throw new Error("cv_download_failed");

    let text: string;
    try {
      const bytes = new Uint8Array(await download.data.arrayBuffer());
      text = clampCvText(await extractDocumentText(bytes, data.fileType, data.fileName));
    } catch (error) {
      if (error instanceof UnsupportedCvFileError) throw new Error("unsupported_file_type");
      throw new Error("cv_text_extraction_failed");
    }
    if (text.length < 80) throw new Error("cv_text_too_short");

    const parsed = await parseCvText(text);

    // Reuse the user's Master CV record, or create it.
    const existing = await supabase
      .from("cvs")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "master")
      .is("deleted_at", null)
      .maybeSingle();
    if (existing.error) throw existing.error;

    let cvId = existing.data?.id;
    if (!cvId) {
      const created = await supabase
        .from("cvs")
        .insert({ user_id: userId, title: parsed.full_name ? `${parsed.full_name} — Master CV` : "Master CV", kind: "master" })
        .select("id")
        .single();
      if (created.error) throw created.error;
      cvId = created.data.id;
    }

    const last = await supabase
      .from("cv_versions")
      .select("version_no")
      .eq("cv_id", cvId)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    const versionNo = (last.data?.version_no ?? 0) + 1;

    const version = await supabase
      .from("cv_versions")
      .insert({
        cv_id: cvId,
        user_id: userId,
        version_no: versionNo,
        label: `Upload v${versionNo}`,
        file_path: data.filePath,
        file_type: data.fileType,
        parsed_data: parsed as never,
        analysis: parsed.analysis as never,
        created_by: "ai",
      })
      .select("id")
      .single();
    if (version.error) throw version.error;

    await supabase.from("cvs").update({ current_version_id: version.data.id }).eq("id", cvId);
    await supabase.from("analytics_events").insert({ user_id: userId, name: "cv_uploaded", properties: { version_no: versionNo } as never });
    await supabase
      .from("agent_states")
      .upsert({ user_id: userId, state: "CV_ANALYSIS", next_action: { action: "review_cv", cv_version_id: version.data.id } as never }, { onConflict: "user_id" });

    return { cvId, versionId: version.data.id, parsed };
  });

const ApplyInput = z.object({ versionId: z.string().uuid() });

/** User-approved write of parsed CV data into the career profile + skills. */
export const applyCvToProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApplyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const version = await supabase
      .from("cv_versions")
      .select("id, parsed_data")
      .eq("id", data.versionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (version.error) throw version.error;
    if (!version.data?.parsed_data) throw new Error("cv_version_not_found");

    const cv = version.data.parsed_data as unknown as ParsedCv;
    const strength = computeProfileStrength(cv);

    const profilePatch: Record<string, unknown> = {
      headline: cv.headline ?? cv.summary ?? null,
      current_title: cv.current_title,
      years_experience: cv.years_experience,
      seniority: cv.seniority,
      track: cv.track ?? (cv.years_experience != null && cv.years_experience < 1 ? "fresh_graduate" : "experienced"),
      industries: cv.industries,
      languages: cv.languages,
      education: cv.education,
      certifications: cv.certifications,
      work_history: cv.work_history,
      profile_strength: strength,
      onboarding_completed: true,
    };
    if (cv.full_name) profilePatch["full_name"] = cv.full_name;
    if (cv.city) profilePatch["city"] = cv.city;
    if (cv.country) profilePatch["country"] = cv.country;

    const updated = await supabase.from("profiles").update(profilePatch as never).eq("user_id", userId);
    if (updated.error) throw updated.error;

    if (cv.skills.length) {
      const rows = cv.skills
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({ user_id: userId, name: s.name.trim(), category: s.category, source: "cv" }));
      const skills = await supabase.from("user_skills").upsert(rows as never, { onConflict: "user_id,normalized_name" });
      if (skills.error) throw skills.error;
    }

    await supabase.from("analytics_events").insert({ user_id: userId, name: "profile_completed", properties: { profile_strength: strength } as never });
    await supabase
      .from("agent_states")
      .upsert({ user_id: userId, state: "PROFILE_REVIEW", next_action: { action: "confirm_targets" } as never }, { onConflict: "user_id" });

    return { profileStrength: strength, skills: cv.skills.length };
  });
