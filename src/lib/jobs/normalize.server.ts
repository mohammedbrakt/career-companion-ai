/**
 * CJDE — Normalization layer.
 * Every collector returns a RawJob; this module converts it into the canonical
 * job shape stored in the central jobs table, and produces the dedupe fingerprint.
 */
import type { Database } from "@/integrations/supabase/types";

type WorkArrangement = Database["public"]["Enums"]["work_arrangement"];
type EmploymentType = Database["public"]["Enums"]["employment_type"];
type Seniority = Database["public"]["Enums"]["seniority_level"];

export type RawJob = {
  source_name: string;
  external_ref: string;
  source_url?: string | null;
  title: string;
  company: string;
  company_logo_url?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  remote?: boolean | null;
  employment_type?: string | null;
  industry?: string | null;
  description?: string | null;
  tags?: string[];
  salary_text?: string | null;
  application_url?: string | null;
  posted_at?: string | null;
  raw?: unknown;
};

export type NormalizedJob = {
  fingerprint: string;
  title: string;
  normalized_title: string;
  company: string;
  company_logo_url: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  work_arrangement: WorkArrangement | null;
  employment_type: EmploymentType | null;
  seniority: Seniority | null;
  description: string | null;
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  languages_required: string[];
  remote_eligible_countries: string[];
  min_years_experience: number | null;
  max_years_experience: number | null;
  education_requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  application_url: string | null;
  posted_at: string | null;
  raw: unknown;
};

const COUNTRY_ALIASES: Record<string, string> = {
  egypt: "Egypt", cairo: "Egypt", "مصر": "Egypt",
  jordan: "Jordan", amman: "Jordan", "الأردن": "Jordan",
  "saudi arabia": "Saudi Arabia", ksa: "Saudi Arabia", riyadh: "Saudi Arabia", jeddah: "Saudi Arabia", "السعودية": "Saudi Arabia",
  uae: "United Arab Emirates", "united arab emirates": "United Arab Emirates", dubai: "United Arab Emirates", "abu dhabi": "United Arab Emirates", "الإمارات": "United Arab Emirates",
  qatar: "Qatar", doha: "Qatar", kuwait: "Kuwait", bahrain: "Bahrain", oman: "Oman", lebanon: "Lebanon", morocco: "Morocco", tunisia: "Tunisia", algeria: "Algeria",
  "united kingdom": "United Kingdom", uk: "United Kingdom", london: "United Kingdom",
  "united states": "United States", usa: "United States", us: "United States",
  germany: "Germany", netherlands: "Netherlands", france: "France", spain: "Spain", portugal: "Portugal", poland: "Poland", canada: "Canada", turkey: "Turkey",
};

const CITY_TO_COUNTRY: Record<string, string> = {
  cairo: "Egypt", giza: "Egypt", alexandria: "Egypt", amman: "Jordan",
  riyadh: "Saudi Arabia", jeddah: "Saudi Arabia", dammam: "Saudi Arabia",
  dubai: "United Arab Emirates", "abu dhabi": "United Arab Emirates", sharjah: "United Arab Emirates",
  doha: "Qatar", manama: "Bahrain", muscat: "Oman", london: "United Kingdom", berlin: "Germany",
};

const SENIORITY_RULES: Array<[RegExp, Seniority]> = [
  [/\b(chief|cxo|ceo|cto|cfo|coo|vp|vice president|head of)\b/i, "executive"],
  [/\bdirector\b/i, "director"],
  [/\b(senior manager|regional manager|general manager|manager)\b/i, "manager"],
  [/\b(lead|principal|staff)\b/i, "lead"],
  [/\b(senior|sr\.?|iii)\b/i, "senior"],
  [/\b(intern|internship)\b/i, "intern"],
  [/\b(junior|jr\.?|entry|graduate|trainee)\b/i, "junior"],
];

const EMPLOYMENT_RULES: Array<[RegExp, EmploymentType]> = [
  [/part[\s-]?time/i, "part_time"],
  [/contract|freelance/i, "contract"],
  [/intern/i, "internship"],
  [/temporary|temp\b/i, "temporary"],
  [/full[\s-]?time/i, "full_time"],
];

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<\s*(br|\/p|\/li|\/div)\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Stable fingerprint used for dedupe across sources. */
export function fingerprintOf(company: string, title: string, country: string | null, city: string | null): string {
  const key = [normalizeText(company), normalizeText(title), normalizeText(country ?? ""), normalizeText(city ?? "")].join("|");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < key.length; i++) {
    h1 = Math.imul(h1 ^ key.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + key.charCodeAt(i) * (i + 1), 2246822519) >>> 0;
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

function parseLocation(raw: RawJob): { country: string | null; city: string | null } {
  if (raw.country || raw.city) {
    return { country: raw.country ?? (raw.city ? (CITY_TO_COUNTRY[raw.city.toLowerCase()] ?? null) : null), city: raw.city ?? null };
  }
  const text = (raw.location ?? "").trim();
  if (!text) return { country: null, city: null };
  const parts = text.split(/[,/|]/).map((p) => p.trim()).filter(Boolean);
  let country: string | null = null;
  let city: string | null = null;
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!country && COUNTRY_ALIASES[key]) country = COUNTRY_ALIASES[key];
    if (!city && CITY_TO_COUNTRY[key]) city = part;
  }
  if (!country && city) country = CITY_TO_COUNTRY[city.toLowerCase()] ?? null;
  if (!country && parts.length > 0) {
    const last = parts[parts.length - 1]!.toLowerCase();
    country = COUNTRY_ALIASES[last] ?? null;
  }
  if (!city && parts.length > 1) city = parts[0]!;
  return { country, city };
}

function detectWorkArrangement(raw: RawJob, locationText: string): WorkArrangement | null {
  const haystack = `${locationText} ${raw.tags?.join(" ") ?? ""} ${raw.title}`.toLowerCase();
  if (raw.remote === true || /\bremote\b|\bعن بعد\b/.test(haystack)) return "remote";
  if (/hybrid/.test(haystack)) return "hybrid";
  if (raw.remote === false) return "onsite";
  return locationText ? "onsite" : null;
}

function detectSeniority(title: string, description: string): Seniority | null {
  for (const [re, level] of SENIORITY_RULES) if (re.test(title)) return level;
  for (const [re, level] of SENIORITY_RULES) if (re.test(description.slice(0, 600))) return level;
  return "mid";
}

function detectEmployment(raw: RawJob, description: string): EmploymentType | null {
  const haystack = `${raw.employment_type ?? ""} ${raw.tags?.join(" ") ?? ""} ${description.slice(0, 400)}`;
  for (const [re, type] of EMPLOYMENT_RULES) if (re.test(haystack)) return type;
  return "full_time";
}

function detectYears(description: string): { min: number | null; max: number | null } {
  const m = description.match(/(\d{1,2})\s*(?:\+|to|-|–)?\s*(\d{1,2})?\s*(?:\+)?\s*years?(?:\s+of)?\s+(?:of\s+)?experience/i);
  if (!m) return { min: null, max: null };
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : null;
  if (!Number.isFinite(a) || a > 40) return { min: null, max: null };
  return { min: a, max: b && b > a && b <= 45 ? b : null };
}

function detectLanguages(description: string): string[] {
  const langs: string[] = [];
  if (/\barabic\b|اللغة العربية/i.test(description)) langs.push("Arabic");
  if (/\benglish\b|اللغة الإنجليزية/i.test(description)) langs.push("English");
  if (/\bfrench\b/i.test(description)) langs.push("French");
  return langs;
}

function detectEducation(description: string): string | null {
  const m = description.match(/(bachelor[^.\n]{0,80}|master[^.\n]{0,80}|mba[^.\n]{0,60}|degree in [^.\n]{0,60})/i);
  return m ? m[0]!.trim() : null;
}

function extractBullets(description: string): string[] {
  return description
    .split("\n")
    .map((line) => line.replace(/^[•\-*\u2022]\s*/, "").trim())
    .filter((line) => line.length > 25 && line.length < 260)
    .slice(0, 12);
}

const SKILL_DICTIONARY = [
  "excel", "sql", "power bi", "tableau", "erp", "sap", "oracle", "odoo", "salesforce", "hubspot",
  "python", "javascript", "typescript", "react", "node.js", "java", "c#", ".net", "php", "django",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd", "git",
  "supply chain", "logistics", "procurement", "warehouse", "inventory", "demand planning", "s&op", "lean", "six sigma", "kaizen",
  "accounting", "ifrs", "budgeting", "forecasting", "financial modeling", "audit", "treasury", "payroll",
  "sales", "b2b", "key account", "negotiation", "crm", "business development", "retail", "fmcg",
  "marketing", "seo", "sem", "content", "social media", "google analytics", "brand",
  "project management", "pmp", "agile", "scrum", "stakeholder management", "kpi", "okr",
  "recruitment", "hr", "talent acquisition", "performance management",
  "customer service", "operations", "quality", "iso", "health and safety",
  "arabic", "english", "leadership", "team management", "communication",
];

function detectSkills(text: string, tags: string[]): { required: string[]; preferred: string[] } {
  const hay = ` ${normalizeText(text)} `;
  const found = new Set<string>();
  for (const skill of SKILL_DICTIONARY) {
    if (hay.includes(` ${normalizeText(skill)} `)) found.add(skill);
  }
  for (const tag of tags) {
    const clean = tag.trim();
    if (clean && clean.length < 30) found.add(clean.toLowerCase());
  }
  const list = [...found].slice(0, 25);
  return { required: list.slice(0, 15), preferred: list.slice(15) };
}

const CURRENCIES: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", egp: "EGP", aed: "AED", sar: "SAR", jod: "JOD", usd: "USD", eur: "EUR" };

function parseSalary(text: string | null | undefined): { min: number | null; max: number | null; currency: string | null; period: string | null } {
  if (!text) return { min: null, max: null, currency: null, period: null };
  const currencyMatch = text.match(/\$|€|£|EGP|AED|SAR|JOD|USD|EUR/i);
  const numbers = [...text.matchAll(/(\d[\d,.]{2,})/g)]
    .map((m) => Number(m[1]!.replace(/[,.](?=\d{3}\b)/g, "").replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 100);
  if (numbers.length === 0) return { min: null, max: null, currency: null, period: null };
  const period = /hour|hr\b/i.test(text) ? "hourly" : /year|annum|annual|yr\b/i.test(text) ? "yearly" : "monthly";
  return {
    min: numbers[0] ?? null,
    max: numbers.length > 1 ? (numbers[1] ?? null) : null,
    currency: currencyMatch ? (CURRENCIES[currencyMatch[0].toLowerCase()] ?? currencyMatch[0].toUpperCase()) : null,
    period,
  };
}

export function normalizeJob(raw: RawJob): NormalizedJob {
  const description = stripHtml(raw.description ?? "").slice(0, 12000);
  const { country, city } = parseLocation(raw);
  const locationText = raw.location ?? [city, country].filter(Boolean).join(", ");
  const work = detectWorkArrangement(raw, locationText);
  const years = detectYears(description);
  const skills = detectSkills(`${raw.title} ${description}`, raw.tags ?? []);
  const salary = parseSalary(raw.salary_text);
  const title = raw.title.trim().replace(/\s+/g, " ");

  return {
    fingerprint: fingerprintOf(raw.company, title, country, city),
    title,
    normalized_title: normalizeText(title),
    company: raw.company.trim(),
    company_logo_url: raw.company_logo_url ?? null,
    industry: raw.industry ?? null,
    country,
    city,
    work_arrangement: work,
    employment_type: detectEmployment(raw, description),
    seniority: detectSeniority(title, description),
    description: description || null,
    responsibilities: extractBullets(description),
    required_skills: skills.required,
    preferred_skills: skills.preferred,
    languages_required: detectLanguages(description),
    remote_eligible_countries: work === "remote" && country ? [country] : [],
    min_years_experience: years.min,
    max_years_experience: years.max,
    education_requirements: detectEducation(description),
    salary_min: salary.min,
    salary_max: salary.max,
    salary_currency: salary.currency,
    salary_period: salary.period,
    application_url: raw.application_url ?? raw.source_url ?? null,
    posted_at: raw.posted_at ?? null,
    raw: raw.raw ?? null,
  };
}
