/**
 * CJDE — Collector layer.
 * A collector is a swappable adapter that fetches jobs from one source and returns RawJob[].
 * Add a new provider by implementing JobCollector and registering it in COLLECTORS;
 * nothing downstream (normalization, dedupe, matching) changes.
 *
 * Keyless sources always run. Key-based sources (Jooble, Adzuna, JSearch) only run when
 * their secret is configured — that is what unlocks local (Egypt / Gulf / on-site) postings.
 */
import type { RawJob } from "./normalize.server";

export type CollectorContext = {
  /** Free-text queries derived from users' target roles. */
  queries: string[];
  /** ISO country names users are targeting. */
  countries: string[];
  limit: number;
  /** Targeted (deep) search: drop postings that do not really answer the queries. */
  strict?: boolean;
};

export type JobCollector = {
  key: string;
  name: string;
  kind: "api" | "feed";
  /** True when the source needs a secret that is not configured yet. */
  requiresKey?: boolean;
  isEnabled?: () => boolean;
  collect: (ctx: CollectorContext) => Promise<RawJob[]>;
};

const UA = "Shoghlni-JobCollector/1.0";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", "user-agent": UA, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

/** Run per-query fetches in parallel; a failing query never kills the run. */
async function fanOut<T, Q = string>(queries: Q[], fn: (query: Q) => Promise<T[]>): Promise<T[]> {
  const settled = await Promise.allSettled(queries.map((q) => fn(q)));
  return settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
}

const str = (v: unknown): string => (v == null ? "" : String(v));

/* ------------------------------------------------------------------ keyless */

/** Remotive — remote jobs API (global, remote-first roles). */
const remotive: JobCollector = {
  key: "remotive",
  name: "Remotive",
  kind: "api",
  collect: async (ctx) => {
    const queries = ctx.queries.length > 0 ? ctx.queries.slice(0, 10) : ["operations"];
    const jobs = await fanOut(queries, async (query) => {
      const data = (await getJson(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=${Math.min(ctx.limit, 50)}`,
      )) as { jobs?: Array<Record<string, unknown>> };
      return (data.jobs ?? []).map<RawJob>((job) => ({
        source_name: "Remotive",
        external_ref: str(job["id"]),
        source_url: str(job["url"]),
        title: str(job["title"]).trim(),
        company: str(job["company_name"]).trim(),
        company_logo_url: (job["company_logo"] as string) || null,
        location: str(job["candidate_required_location"]) || null,
        remote: true,
        employment_type: (job["job_type"] as string) ?? null,
        industry: (job["category"] as string) ?? null,
        description: (job["description"] as string) ?? null,
        tags: Array.isArray(job["tags"]) ? (job["tags"] as string[]) : [],
        salary_text: (job["salary"] as string) ?? null,
        application_url: str(job["url"]),
        posted_at: (job["publication_date"] as string) ?? null,
        raw: job,
      }));
    });
    return jobs
      .filter((j) => j.title && j.company)
      .filter((j) => queries.every((q) => !q) || queries.some((q) => matchesQuery(j.title, q)));
  },
};

/** Arbeitnow — open job board API (Europe + remote worldwide). */
const arbeitnow: JobCollector = {
  key: "arbeitnow",
  name: "Arbeitnow",
  kind: "api",
  collect: async (ctx) => {
    const wanted = ctx.queries.map((q) => q.toLowerCase());
    const pages = [1, 2, 3];
    const jobs = await fanOut(pages.map(String), async (page) => {
      const data = (await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`)) as {
        data?: Array<Record<string, unknown>>;
      };
      return (data.data ?? []).map<RawJob>((job) => ({
        source_name: "Arbeitnow",
        external_ref: str(job["slug"]),
        source_url: str(job["url"]),
        title: str(job["title"]).trim(),
        company: str(job["company_name"]).trim(),
        location: str(job["location"]) || null,
        remote: Boolean(job["remote"]),
        description: (job["description"] as string) ?? null,
        tags: Array.isArray(job["tags"]) ? (job["tags"] as string[]) : [],
        application_url: str(job["url"]),
        posted_at: job["created_at"] ? new Date(Number(job["created_at"]) * 1000).toISOString() : null,
        raw: job,
      }));
    });
    return jobs
      .filter((j) => j.title && j.company)
      .filter((j) => wanted.length === 0 || wanted.some((q) => matchesQuery(j.title, q)))
      .slice(0, ctx.limit * 2);
  },
};

/** Jobicy — remote jobs feed, queried per role title. */
const jobicy: JobCollector = {
  key: "jobicy",
  name: "Jobicy",
  kind: "api",
  collect: async (ctx) => {
    const queries = ctx.queries.length > 0 ? ctx.queries.slice(0, 8) : [""];
    const jobs = await fanOut(queries, async (query) => {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=${Math.min(ctx.limit, 50)}${
        query ? `&tag=${encodeURIComponent(query)}` : ""
      }`;
      const data = (await getJson(url)) as { jobs?: Array<Record<string, unknown>> };
      return (data.jobs ?? []).map<RawJob>((job) => ({
        source_name: "Jobicy",
        external_ref: str(job["id"]),
        source_url: str(job["url"]),
        title: str(job["jobTitle"]).trim(),
        company: str(job["companyName"]).trim(),
        company_logo_url: (job["companyLogo"] as string) || null,
        location: str(job["jobGeo"]) || null,
        remote: true,
        employment_type: Array.isArray(job["jobType"]) ? str((job["jobType"] as string[])[0]) : null,
        industry: Array.isArray(job["jobIndustry"]) ? str((job["jobIndustry"] as string[])[0]) : null,
        description: (job["jobDescription"] as string) ?? (job["jobExcerpt"] as string) ?? null,
        salary_text:
          job["annualSalaryMin"] && job["annualSalaryMax"]
            ? `${job["annualSalaryMin"]} - ${job["annualSalaryMax"]} ${job["salaryCurrency"] ?? "USD"} per year`
            : null,
        application_url: str(job["url"]),
        posted_at: (job["pubDate"] as string) ?? null,
        raw: job,
      }));
    });
    return jobs
      .filter((j) => j.title && j.company)
      .filter((j) => queries.every((q) => !q) || queries.some((q) => matchesQuery(j.title, q)));
  },
};

/** RemoteOK — large keyless remote board. */
const remoteok: JobCollector = {
  key: "remoteok",
  name: "RemoteOK",
  kind: "api",
  collect: async (ctx) => {
    const data = (await getJson("https://remoteok.com/api")) as Array<Record<string, unknown>>;
    const wanted = ctx.queries.map((q) => q.toLowerCase());
    return (Array.isArray(data) ? data : [])
      .filter((job) => job["id"] && job["position"])
      .map<RawJob>((job) => ({
        source_name: "RemoteOK",
        external_ref: str(job["id"]),
        source_url: str(job["url"]),
        title: str(job["position"]).trim(),
        company: str(job["company"]).trim(),
        company_logo_url: (job["company_logo"] as string) || null,
        location: str(job["location"]) || null,
        remote: true,
        description: (job["description"] as string) ?? null,
        tags: Array.isArray(job["tags"]) ? (job["tags"] as string[]) : [],
        salary_text:
          job["salary_min"] && job["salary_max"] ? `${job["salary_min"]} - ${job["salary_max"]} USD per year` : null,
        application_url: str(job["apply_url"] || job["url"]),
        posted_at: (job["date"] as string) ?? null,
        raw: job,
      }))
      .filter((j) => j.title && j.company)
      .filter((j) => wanted.length === 0 || wanted.some((q) => matchesQuery(j.title, q)));
  },
};

/** Himalayas — keyless remote board with wide non-tech coverage. */
const himalayas: JobCollector = {
  key: "himalayas",
  name: "Himalayas",
  kind: "api",
  collect: async (ctx) => {
    const wanted = ctx.queries.map((q) => q.toLowerCase());
    const offsets = [0, 50, 100];
    const jobs = await fanOut(offsets.map(String), async (offset) => {
      const data = (await getJson(`https://himalayas.app/jobs/api?limit=50&offset=${offset}`)) as {
        jobs?: Array<Record<string, unknown>>;
      };
      return (data.jobs ?? []).map<RawJob>((job) => ({
        source_name: "Himalayas",
        external_ref: str(job["guid"] || job["applicationLink"]),
        source_url: str(job["applicationLink"]),
        title: str(job["title"]).trim(),
        company: str(job["companyName"]).trim(),
        company_logo_url: (job["companyLogo"] as string) || null,
        location: Array.isArray(job["locationRestrictions"]) ? (job["locationRestrictions"] as string[]).join(", ") : null,
        remote: true,
        employment_type: (job["employmentType"] as string) ?? null,
        description: (job["description"] as string) ?? (job["excerpt"] as string) ?? null,
        tags: Array.isArray(job["categories"]) ? (job["categories"] as string[]) : [],
        application_url: str(job["applicationLink"]),
        posted_at: job["pubDate"] ? new Date(Number(job["pubDate"]) * 1000).toISOString() : null,
        raw: job,
      }));
    });
    return jobs
      .filter((j) => j.title && j.company)
      .filter((j) => wanted.length === 0 || wanted.some((q) => matchesQuery(j.title, q)));
  },
};

/** We Work Remotely — public RSS feed. */
const weworkremotely: JobCollector = {
  key: "weworkremotely",
  name: "We Work Remotely",
  kind: "feed",
  collect: async (ctx) => {
    const xml = await getText("https://weworkremotely.com/remote-jobs.rss");
    const wanted = ctx.queries.map((q) => q.toLowerCase());
    const items = xml.split("<item>").slice(1);
    const pick = (block: string, tag: string): string => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      if (!m) return "";
      return m[1]!.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
    };
    return items
      .map<RawJob>((block) => {
        const rawTitle = pick(block, "title");
        const [company, ...rest] = rawTitle.split(":");
        const title = (rest.join(":") || rawTitle).trim();
        const link = pick(block, "link");
        return {
          source_name: "We Work Remotely",
          external_ref: link,
          source_url: link,
          title,
          company: (company ?? "").trim(),
          location: pick(block, "region") || "Remote",
          remote: true,
          description: pick(block, "description"),
          application_url: link,
          posted_at: pick(block, "pubDate") ? new Date(pick(block, "pubDate")).toISOString() : null,
          raw: { title: rawTitle, link },
        };
      })
      .filter((j) => j.title && j.company)
      .filter((j) => wanted.length === 0 || wanted.some((q) => matchesQuery(j.title, q)));
  },
};

/* ------------------------------------------------------- key-based (local jobs) */

/** Jooble — aggregator with strong Egypt / MENA on-site coverage. Needs JOOBLE_API_KEY. */
const jooble: JobCollector = {
  key: "jooble",
  name: "Jooble",
  kind: "api",
  requiresKey: true,
  isEnabled: () => Boolean(env("JOOBLE_API_KEY")),
  collect: async (ctx) => {
    const key = env("JOOBLE_API_KEY");
    if (!key) return [];
    const locations = ctx.countries.length > 0 ? ctx.countries.slice(0, 4) : ["Egypt"];
    const queries = ctx.queries.slice(0, 6);
    const pairs = queries.flatMap((q) => locations.map((loc) => `${q}||${loc}`));
    const jobs = await fanOut(pairs, async (pair) => {
      const [keywords, location] = pair.split("||");
      const data = (await getJson(`https://jooble.org/api/${key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keywords, location, page: "1" }),
      })) as { jobs?: Array<Record<string, unknown>> };
      return (data.jobs ?? []).map<RawJob>((job) => ({
        source_name: "Jooble",
        external_ref: str(job["id"] || job["link"]),
        source_url: str(job["link"]),
        title: str(job["title"]).trim(),
        company: str(job["company"]).trim() || "Confidential",
        location: str(job["location"]) || location || null,
        remote: /remote/i.test(str(job["title"]) + str(job["location"])),
        employment_type: (job["type"] as string) ?? null,
        description: (job["snippet"] as string) ?? null,
        salary_text: (job["salary"] as string) ?? null,
        application_url: str(job["link"]),
        posted_at: (job["updated"] as string) ?? null,
        raw: job,
      }));
    });
    return jobs.filter((j) => j.title);
  },
};

/**
 * Adzuna — strong local coverage in Europe, North America, Australia, India,
 * South Africa and the UAE. Needs ADZUNA_APP_ID + ADZUNA_APP_KEY.
 * Only these markets exist on Adzuna; other countries are served by JSearch.
 */
const ADZUNA_MARKETS = new Set([
  "at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it",
  "mx", "nl", "nz", "pl", "sg", "us", "za", "ae",
]);

const adzuna: JobCollector = {
  key: "adzuna",
  name: "Adzuna",
  kind: "api",
  requiresKey: true,
  isEnabled: () => Boolean(env("ADZUNA_APP_ID") && env("ADZUNA_APP_KEY")),
  collect: async (ctx) => {
    const appId = env("ADZUNA_APP_ID");
    const appKey = env("ADZUNA_APP_KEY");
    if (!appId || !appKey) return [];
    const codes = [
      ...new Set(
        (ctx.countries.length > 0 ? ctx.countries : ["United States", "United Kingdom"])
          .map((c) => countryCode(c))
          .filter((c) => ADZUNA_MARKETS.has(c)),
      ),
    ].slice(0, 3);
    const queries = ctx.queries.slice(0, ctx.strict ? 10 : 5);
    const pairs = codes.flatMap((code) => queries.map((q) => `${code}||${q}`));
    const jobs = await fanOut(pairs, async (pair) => {
      const [code, query] = pair.split("||");
      const data = (await getJson(
        `https://api.adzuna.com/v1/api/jobs/${code}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(
          query ?? "",
        )}&content-type=application/json`,
      )) as { results?: Array<Record<string, unknown>> };
      return (data.results ?? []).map<RawJob>((job) => {
        const company = (job["company"] as Record<string, unknown> | undefined)?.["display_name"];
        const location = (job["location"] as Record<string, unknown> | undefined)?.["display_name"];
        return {
          source_name: "Adzuna",
          external_ref: str(job["id"]),
          source_url: str(job["redirect_url"]),
          title: str(job["title"]).replace(/<[^>]+>/g, "").trim(),
          company: str(company).trim() || "Confidential",
          location: str(location) || null,
          remote: /remote/i.test(str(job["title"])),
          employment_type: (job["contract_time"] as string) ?? null,
          industry: str((job["category"] as Record<string, unknown> | undefined)?.["label"]) || null,
          description: (job["description"] as string) ?? null,
          salary_text:
            job["salary_min"] && job["salary_max"] ? `${job["salary_min"]} - ${job["salary_max"]} per year` : null,
          application_url: str(job["redirect_url"]),
          posted_at: (job["created"] as string) ?? null,
          raw: job,
        };
      });
    });
    return jobs.filter((j) => j.title && j.company);
  },
};

/**
 * Worldwide country codes. Users are not only in the Arab world — Europe, the
 * Americas, Asia and Africa all resolve here, so the same deep search serves
 * everyone. Unknown names fall back to a worldwide (US-indexed) search.
 */
const COUNTRY_CODES: Record<string, string> = {
  // MENA
  egypt: "eg", مصر: "eg", "saudi arabia": "sa", ksa: "sa", السعودية: "sa",
  "united arab emirates": "ae", uae: "ae", الإمارات: "ae", qatar: "qa", kuwait: "kw",
  bahrain: "bh", oman: "om", jordan: "jo", lebanon: "lb", iraq: "iq",
  morocco: "ma", tunisia: "tn", algeria: "dz", libya: "ly", sudan: "sd", turkey: "tr", israel: "il",
  // Europe
  "united kingdom": "gb", uk: "gb", england: "gb", ireland: "ie", germany: "de", deutschland: "de",
  netherlands: "nl", holland: "nl", france: "fr", spain: "es", portugal: "pt", italy: "it",
  belgium: "be", switzerland: "ch", austria: "at", sweden: "se", norway: "no", denmark: "dk",
  finland: "fi", poland: "pl", "czech republic": "cz", czechia: "cz", romania: "ro", greece: "gr",
  hungary: "hu", ukraine: "ua", bulgaria: "bg", croatia: "hr", serbia: "rs", estonia: "ee",
  lithuania: "lt", latvia: "lv", luxembourg: "lu", slovakia: "sk", slovenia: "si",
  // Americas
  "united states": "us", usa: "us", us: "us", america: "us", canada: "ca", mexico: "mx",
  brazil: "br", argentina: "ar", chile: "cl", colombia: "co", peru: "pe",
  // Asia-Pacific & Africa
  india: "in", pakistan: "pk", bangladesh: "bd", philippines: "ph", indonesia: "id",
  malaysia: "my", singapore: "sg", "hong kong": "hk", japan: "jp", "south korea": "kr",
  china: "cn", vietnam: "vn", thailand: "th", australia: "au", "new zealand": "nz",
  "south africa": "za", nigeria: "ng", kenya: "ke", ghana: "gh", ethiopia: "et",
  // Remote / worldwide
  remote: "us", worldwide: "us", anywhere: "us", global: "us",
};

export function countryCode(name: string): string {
  return COUNTRY_CODES[name.trim().toLowerCase()] ?? "us";
}

/** JSearch (RapidAPI) — Google-for-Jobs index: the widest local coverage, including Egypt. Needs JSEARCH_RAPIDAPI_KEY. */
const jsearch: JobCollector = {
  key: "jsearch",
  name: "JSearch",
  kind: "api",
  requiresKey: true,
  isEnabled: () => Boolean(env("JSEARCH_RAPIDAPI_KEY")),
  collect: async (ctx) => {
    const key = env("JSEARCH_RAPIDAPI_KEY");
    if (!key) return [];
    // No target country means the person is open anywhere: search remote worldwide.
    const locations = ctx.countries.length > 0 ? ctx.countries.slice(0, 3) : ["Remote"];
    const maxQueries = ctx.strict ? 12 : 6;
    const pairs = ctx.queries
      .slice(0, maxQueries)
      .flatMap((q) => locations.map((loc) => ({ query: /remote|worldwide|anywhere/i.test(loc) ? `${q} remote` : `${q} in ${loc}`, loc })));
    const jobs = await fanOut(pairs, async ({ query, loc }) => {
      const code = countryCode(loc);
      // The live endpoint is /search-v2 (the docs' /search path is retired) and it
      // returns { data: { jobs: [...] } }.
      const data = (await getJson(
        `https://jsearch.p.rapidapi.com/search-v2?query=${encodeURIComponent(
          query,
        )}&country=${code}&language=en&num_pages=${ctx.strict ? 3 : 2}&date_posted=month`,
        { headers: { "x-rapidapi-key": key, "x-rapidapi-host": "jsearch.p.rapidapi.com" } },
      )) as { data?: { jobs?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> };
      const raw = Array.isArray(data.data) ? data.data : (data.data?.jobs ?? []);
      return raw.map<RawJob>((job) => ({
        source_name: "JSearch",
        external_ref: str(job["job_uid"]) || str(job["job_id"]),
        source_url: str(job["job_apply_link"]),
        title: str(job["job_title"]).trim(),
        company: str(job["employer_name"]).trim() || "Confidential",
        company_logo_url: (job["employer_logo"] as string) || null,
        location:
          [job["job_city"], job["job_state"], job["job_country"]].filter(Boolean).map(str).join(", ") ||
          str(job["job_location"]).split("•")[0]?.trim() ||
          loc,
        remote: Boolean(job["job_is_remote"]),
        employment_type: (job["job_employment_type"] as string) ?? null,
        description: (job["job_description"] as string) ?? null,
        salary_text: (job["job_salary_string"] as string) ?? null,
        application_url: str(job["job_apply_link"]),
        posted_at: (job["job_posted_at_datetime_utc"] as string) ?? null,
        raw: job,
      }));
    });
    return jobs.filter((j) => j.title && j.application_url);
  },
};

/**
 * Relevance filter. Generic seniority words ("manager", "senior") match everything,
 * so a title only counts when it shares a distinctive word with the query
 * ("supply", "chain", "logistics", "planning"...).
 */
const GENERIC_WORDS = new Set([
  "manager",
  "senior",
  "junior",
  "lead",
  "head",
  "director",
  "officer",
  "specialist",
  "executive",
  "assistant",
  "associate",
  "coordinator",
  "supervisor",
  "engineer",
  "analyst",
  "consultant",
  "the",
  "and",
  "for",
  "remote",
]);

export function matchesQuery(title: string, query: string): boolean {
  const t = title.toLowerCase();
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((w) => w.length > 2);
  if (words.length === 0) return true;
  const distinctive = words.filter((w) => !GENERIC_WORDS.has(w));
  const required = distinctive.length > 0 ? distinctive : words;
  return required.some((w) => t.includes(w));
}

export const COLLECTORS: JobCollector[] = [
  remotive,
  jobicy,
  arbeitnow,
  remoteok,
  himalayas,
  weworkremotely,
  jooble,
  adzuna,
  jsearch,
];

/** Only the sources that can actually run right now. */
export function activeCollectors(): JobCollector[] {
  return COLLECTORS.filter((c) => (c.isEnabled ? c.isEnabled() : true));
}

/** Names of key-based sources that are configured / still missing their secret. */
export function collectorAvailability(): { enabled: string[]; missingKey: string[] } {
  const enabled: string[] = [];
  const missingKey: string[] = [];
  for (const c of COLLECTORS) {
    if (c.isEnabled ? c.isEnabled() : true) enabled.push(c.name);
    else missingKey.push(c.name);
  }
  return { enabled, missingKey };
}

export function getCollector(key: string): JobCollector | undefined {
  return COLLECTORS.find((c) => c.key === key);
}
