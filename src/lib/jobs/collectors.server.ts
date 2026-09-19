/**
 * CJDE — Collector layer.
 * A collector is a swappable adapter that fetches jobs from one source and returns RawJob[].
 * Add a new provider by implementing JobCollector and registering it in COLLECTORS;
 * nothing downstream (normalization, dedupe, matching) changes.
 */
import type { RawJob } from "./normalize.server";

export type CollectorContext = {
  /** Free-text queries derived from users' target roles. */
  queries: string[];
  /** ISO country names users are targeting. */
  countries: string[];
  limit: number;
};

export type JobCollector = {
  key: string;
  name: string;
  kind: "api" | "feed";
  collect: (ctx: CollectorContext) => Promise<RawJob[]>;
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "Shoghlni-JobCollector/1.0" } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.json();
}

/** Remotive — remote jobs API (global, remote-first roles). */
const remotive: JobCollector = {
  key: "remotive",
  name: "Remotive",
  kind: "api",
  collect: async (ctx) => {
    const out: RawJob[] = [];
    const queries = ctx.queries.length > 0 ? ctx.queries.slice(0, 6) : ["operations"];
    for (const query of queries) {
      try {
        const data = (await getJson(
          `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=${Math.min(ctx.limit, 40)}`,
        )) as { jobs?: Array<Record<string, unknown>> };
        for (const job of data.jobs ?? []) {
          out.push({
            source_name: "Remotive",
            external_ref: String(job["id"]),
            source_url: String(job["url"] ?? ""),
            title: String(job["title"] ?? "").trim(),
            company: String(job["company_name"] ?? "").trim(),
            company_logo_url: (job["company_logo"] as string) || null,
            location: String(job["candidate_required_location"] ?? "") || null,
            remote: true,
            employment_type: (job["job_type"] as string) ?? null,
            industry: (job["category"] as string) ?? null,
            description: (job["description"] as string) ?? null,
            tags: Array.isArray(job["tags"]) ? (job["tags"] as string[]) : [],
            salary_text: (job["salary"] as string) ?? null,
            application_url: String(job["url"] ?? ""),
            posted_at: (job["publication_date"] as string) ?? null,
            raw: job,
          });
        }
      } catch {
        // one failing query must not kill the run
      }
    }
    return out.filter((j) => j.title && j.company);
  },
};

/** Arbeitnow — open job board API (Europe + remote worldwide). */
const arbeitnow: JobCollector = {
  key: "arbeitnow",
  name: "Arbeitnow",
  kind: "api",
  collect: async (ctx) => {
    const out: RawJob[] = [];
    try {
      const data = (await getJson("https://www.arbeitnow.com/api/job-board-api")) as { data?: Array<Record<string, unknown>> };
      const wanted = ctx.queries.map((q) => q.toLowerCase());
      for (const job of data.data ?? []) {
        const title = String(job["title"] ?? "").trim();
        if (wanted.length > 0 && !wanted.some((q) => title.toLowerCase().includes(q.split(" ")[0] ?? q))) continue;
        out.push({
          source_name: "Arbeitnow",
          external_ref: String(job["slug"]),
          source_url: String(job["url"] ?? ""),
          title,
          company: String(job["company_name"] ?? "").trim(),
          location: String(job["location"] ?? "") || null,
          remote: Boolean(job["remote"]),
          description: (job["description"] as string) ?? null,
          tags: Array.isArray(job["tags"]) ? (job["tags"] as string[]) : [],
          application_url: String(job["url"] ?? ""),
          posted_at: job["created_at"] ? new Date(Number(job["created_at"]) * 1000).toISOString() : null,
          raw: job,
        });
      }
    } catch {
      // source unavailable this run
    }
    return out.filter((j) => j.title && j.company).slice(0, ctx.limit);
  },
};

/** Jobicy — remote jobs feed with geo filtering. */
const jobicy: JobCollector = {
  key: "jobicy",
  name: "Jobicy",
  kind: "api",
  collect: async (ctx) => {
    const out: RawJob[] = [];
    try {
      const data = (await getJson(`https://jobicy.com/api/v2/remote-jobs?count=${Math.min(ctx.limit, 50)}`)) as {
        jobs?: Array<Record<string, unknown>>;
      };
      for (const job of data.jobs ?? []) {
        out.push({
          source_name: "Jobicy",
          external_ref: String(job["id"]),
          source_url: String(job["url"] ?? ""),
          title: String(job["jobTitle"] ?? "").trim(),
          company: String(job["companyName"] ?? "").trim(),
          company_logo_url: (job["companyLogo"] as string) || null,
          location: String(job["jobGeo"] ?? "") || null,
          remote: true,
          employment_type: Array.isArray(job["jobType"]) ? String((job["jobType"] as string[])[0]) : null,
          industry: Array.isArray(job["jobIndustry"]) ? String((job["jobIndustry"] as string[])[0]) : null,
          description: (job["jobDescription"] as string) ?? (job["jobExcerpt"] as string) ?? null,
          salary_text:
            job["annualSalaryMin"] && job["annualSalaryMax"]
              ? `${job["annualSalaryMin"]} - ${job["annualSalaryMax"]} ${job["salaryCurrency"] ?? "USD"} per year`
              : null,
          application_url: String(job["url"] ?? ""),
          posted_at: (job["pubDate"] as string) ?? null,
          raw: job,
        });
      }
    } catch {
      // source unavailable this run
    }
    return out.filter((j) => j.title && j.company);
  },
};

export const COLLECTORS: JobCollector[] = [remotive, jobicy, arbeitnow];

export function getCollector(key: string): JobCollector | undefined {
  return COLLECTORS.find((c) => c.key === key);
}
