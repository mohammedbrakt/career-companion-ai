import { z } from "zod";

/**
 * Strict-compatible structured CV schema (Responses API rules: every property
 * required, optional values expressed as nullable, no bounds/defaults).
 * This is the canonical shape of a parsed Master CV across the app.
 */

export const workEntrySchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean(),
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
});

export const educationEntrySchema = z.object({
  degree: z.string(),
  field: z.string().nullable(),
  institution: z.string(),
  end_year: z.string().nullable(),
});

export const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable(),
  year: z.string().nullable(),
});

export const languageSchema = z.object({
  name: z.string(),
  level: z.string().nullable(),
});

export const skillSchema = z.object({
  name: z.string(),
  category: z.string().nullable(),
});

export const cvAnalysisSchema = z.object({
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  ats_issues: z.array(z.string()),
  missing_sections: z.array(z.string()),
  suggestions: z.array(z.string()),
  missing_questions: z.array(z.string()),
});

export const parsedCvSchema = z.object({
  full_name: z.string().nullable(),
  headline: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  summary: z.string().nullable(),
  current_title: z.string().nullable(),
  years_experience: z.number().nullable(),
  seniority: z
    .enum(["intern", "entry", "junior", "mid", "senior", "lead", "manager", "director", "executive"])
    .nullable(),
  track: z.enum(["fresh_graduate", "experienced"]).nullable(),
  management_experience: z.boolean(),
  industries: z.array(z.string()),
  work_history: z.array(workEntrySchema),
  education: z.array(educationEntrySchema),
  certifications: z.array(certificationSchema),
  languages: z.array(languageSchema),
  skills: z.array(skillSchema),
  analysis: cvAnalysisSchema,
});

export type ParsedCv = z.infer<typeof parsedCvSchema>;
export type CvAnalysis = z.infer<typeof cvAnalysisSchema>;

/** Deterministic profile-strength score (0-100) from a parsed CV + profile. */
export function computeProfileStrength(cv: Pick<ParsedCv, "full_name" | "current_title" | "years_experience" | "summary" | "work_history" | "education" | "skills" | "languages" | "certifications" | "city">): number {
  let score = 0;
  if (cv.full_name) score += 10;
  if (cv.current_title) score += 10;
  if (cv.years_experience != null) score += 10;
  if (cv.city) score += 5;
  if (cv.summary) score += 10;
  if (cv.work_history.length > 0) score += 15;
  if (cv.work_history.some((w) => w.achievements.length > 0)) score += 10;
  if (cv.education.length > 0) score += 10;
  if (cv.skills.length >= 5) score += 10;
  if (cv.languages.length > 0) score += 5;
  if (cv.certifications.length > 0) score += 5;
  return Math.min(100, score);
}
