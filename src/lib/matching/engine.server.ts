/**
 * Matching Engine.
 * Hard eligibility filters run BEFORE any score, so a job the user legally or
 * practically cannot take never shows an attractive percentage.
 * The score is explainable: per-dimension breakdown + strengths + gaps.
 */
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Preferences = Database["public"]["Tables"]["career_preferences"]["Row"];
type Seniority = Database["public"]["Enums"]["seniority_level"];

export type MatchContext = {
  profile: Profile | null;
  preferences: Preferences | null;
  skills: string[];
  targets: string[];
  locale: "ar" | "en";
};

export type MatchResult = {
  score: number;
  eligible: boolean;
  ineligibility_reasons: string[];
  breakdown: Record<string, number>;
  strengths: string[];
  gaps: string[];
  recommendation: string;
};

const SENIORITY_RANK: Record<Seniority, number> = {
  intern: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  lead: 5,
  manager: 6,
  director: 7,
  executive: 8,
};

const copy = {
  en: {
    expired: "This job is no longer active.",
    location: (c: string) => `Based in ${c}, outside your target locations, and not remote.`,
    language: (l: string) => `Requires ${l}, which is not in your profile.`,
    seniority: "The seniority level is far from your current level.",
    years: (n: number) => `Requires about ${n} years of experience.`,
    strongYears: (n: number) => `Your ${n} years of experience fit the requirement.`,
    skillMatch: (s: string[]) => `Strong skill overlap: ${s.join(", ")}.`,
    industry: (i: string) => `You have ${i} experience.`,
    locationFit: (c: string) => `Location works for you (${c}).`,
    remoteFit: "Fully remote, matching your preference.",
    seniorityFit: "Seniority matches your level.",
    skillGap: (s: string[]) => `Not evidenced in your CV: ${s.join(", ")}.`,
    yearsGap: (n: number) => `Asks for ~${n} years; your profile shows fewer.`,
    industryGap: "Different industry from your background.",
    educationGap: (e: string) => `Education requirement: ${e}.`,
    excellent: "Excellent fit — worth applying today.",
    good: "Good fit — worth a look.",
    weak: "Weak fit — only if you want a change of direction.",
  },
  ar: {
    expired: "هذه الوظيفة لم تعد متاحة.",
    location: (c: string) => `مقرها ${c} خارج المواقع المستهدفة، وليست عن بعد.`,
    language: (l: string) => `تتطلب ${l} وهي غير موجودة في ملفك.`,
    seniority: "المستوى الوظيفي بعيد جدًا عن مستواك الحالي.",
    years: (n: number) => `تتطلب حوالي ${n} سنوات خبرة.`,
    strongYears: (n: number) => `خبرتك ${n} سنة مناسبة للمطلوب.`,
    skillMatch: (s: string[]) => `تطابق قوي في المهارات: ${s.join("، ")}.`,
    industry: (i: string) => `لديك خبرة في مجال ${i}.`,
    locationFit: (c: string) => `الموقع مناسب لك (${c}).`,
    remoteFit: "عن بعد بالكامل، وهو ما تفضله.",
    seniorityFit: "المستوى الوظيفي مطابق لمستواك.",
    skillGap: (s: string[]) => `غير موجودة في سيرتك: ${s.join("، ")}.`,
    yearsGap: (n: number) => `تطلب حوالي ${n} سنوات، وملفك يقل عن ذلك.`,
    industryGap: "المجال مختلف عن خلفيتك.",
    educationGap: (e: string) => `متطلب تعليمي: ${e}.`,
    excellent: "تطابق ممتاز — تستحق التقديم اليوم.",
    good: "تطابق جيد — تستحق نظرة.",
    weak: "تطابق ضعيف — فقط لو تريد تغيير المسار.",
  },
} as const;

function norm(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

export function scoreJob(job: Job, ctx: MatchContext): MatchResult {
  const L = copy[ctx.locale];
  const profile = ctx.profile;
  const prefs = ctx.preferences;
  const reasons: string[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];

  // ---- Hard eligibility filters ----
  if (job.status === "expired" || job.status === "removed") reasons.push(L.expired);

  const targetCountries = prefs?.target_countries ?? [];
  const remoteOk = job.work_arrangement === "remote";
  const sameCountry = !job.country || !profile?.country || norm(job.country) === norm(profile.country);
  const inTargets = job.country ? targetCountries.some((c) => norm(c) === norm(job.country!)) : true;
  if (!remoteOk && !sameCountry && !inTargets && targetCountries.length > 0) {
    reasons.push(L.location(job.country ?? "-"));
  }

  const profileLanguages = new Set(
    (Array.isArray(profile?.languages) ? (profile?.languages as Array<{ name?: string }>) : []).map((l) => norm(String(l?.name ?? ""))),
  );
  for (const required of job.languages_required ?? []) {
    if (profileLanguages.size > 0 && !profileLanguages.has(norm(required))) {
      reasons.push(L.language(required));
      break;
    }
  }

  const userRank = profile?.seniority ? SENIORITY_RANK[profile.seniority] : null;
  const jobRank = job.seniority ? SENIORITY_RANK[job.seniority] : null;
  if (userRank && jobRank && Math.abs(userRank - jobRank) >= 4) reasons.push(L.seniority);

  const userYears = profile?.years_experience ?? null;
  if (job.min_years_experience && userYears != null && userYears + 3 < job.min_years_experience) {
    reasons.push(L.years(job.min_years_experience));
  }

  // ---- Dimensions ----
  // Experience
  let experience = 60;
  if (job.min_years_experience != null && userYears != null) {
    const delta = userYears - job.min_years_experience;
    experience = delta >= 0 ? Math.min(100, 85 + delta * 3) : Math.max(15, 85 + delta * 15);
    if (delta >= 0) strengths.push(L.strongYears(userYears));
    else gaps.push(L.yearsGap(job.min_years_experience));
  } else if (userYears != null) {
    experience = 75;
  }

  // Skills
  const jobSkills = [...(job.required_skills ?? []), ...(job.preferred_skills ?? [])].map(norm).filter(Boolean);
  const userSkills = new Set(ctx.skills.map(norm).filter(Boolean));
  const matched = [...new Set(jobSkills.filter((s) => userSkills.has(s)))];
  const missing = [...new Set(jobSkills.filter((s) => !userSkills.has(s)))];
  const skills = jobSkills.length === 0 ? 60 : Math.round((matched.length / Math.min(jobSkills.length, 12)) * 100);
  if (matched.length > 0) strengths.push(L.skillMatch(matched.slice(0, 4)));
  if (missing.length > 0) gaps.push(L.skillGap(missing.slice(0, 4)));

  // Industry
  const userIndustries = [...(profile?.industries ?? []), ...(prefs?.target_industries ?? [])].map(norm);
  let industry = 60;
  if (job.industry) {
    const hit = userIndustries.some((i) => i && (norm(job.industry!).includes(i) || i.includes(norm(job.industry!))));
    industry = hit ? 95 : 45;
    if (hit) strengths.push(L.industry(job.industry));
    else if (userIndustries.length > 0) gaps.push(L.industryGap);
  }

  // Education
  let education = 70;
  const hasDegree = Array.isArray(profile?.education) && (profile?.education as unknown[]).length > 0;
  if (job.education_requirements) {
    education = hasDegree ? 90 : 50;
    if (!hasDegree) gaps.push(L.educationGap(job.education_requirements));
  } else if (hasDegree) education = 85;

  // Location
  let location = 60;
  if (remoteOk) {
    location = (prefs?.work_arrangements ?? []).includes("remote") ? 100 : 85;
    strengths.push(L.remoteFit);
  } else if (job.country && profile?.country && norm(job.country) === norm(profile.country)) {
    location = 95;
    strengths.push(L.locationFit(job.city ?? job.country));
  } else if (job.country && inTargets) {
    location = 88;
    strengths.push(L.locationFit(job.city ?? job.country));
  } else if (job.country) {
    location = 30;
  }

  // Seniority
  let seniority = 70;
  if (userRank && jobRank) {
    const diff = Math.abs(userRank - jobRank);
    seniority = Math.max(20, 100 - diff * 20);
    if (diff <= 1) strengths.push(L.seniorityFit);
  }

  // Target-role alignment folds into the title relevance of the skills dimension.
  const titleMatch = ctx.targets.some((t) => t && norm(job.title).includes(norm(t).split(" ")[0] ?? ""));
  const breakdown = {
    experience: Math.round(experience),
    skills: Math.round(Math.min(100, skills + (titleMatch ? 10 : 0))),
    industry: Math.round(industry),
    education: Math.round(education),
    location: Math.round(location),
    seniority: Math.round(seniority),
  };

  const weights = { experience: 0.25, skills: 0.28, industry: 0.12, education: 0.08, location: 0.15, seniority: 0.12 };
  const raw = (Object.keys(weights) as Array<keyof typeof weights>).reduce((sum, key) => sum + breakdown[key] * weights[key], 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score: reasons.length > 0 ? Math.min(score, 40) : score,
    eligible: reasons.length === 0,
    ineligibility_reasons: reasons,
    breakdown,
    strengths: strengths.slice(0, 5),
    gaps: gaps.slice(0, 4),
    recommendation: score >= 85 ? L.excellent : score >= 70 ? L.good : L.weak,
  };
}
