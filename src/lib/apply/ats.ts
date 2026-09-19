/**
 * ATS detection — works out which applicant tracking system an employer link
 * belongs to, so the agent can submit the application directly instead of
 * asking the user to fill a form by hand.
 *
 * Client-safe: used both in the UI (to show "your agent can apply for you")
 * and on the server (to pick the submission adapter).
 */

export type AtsProvider = "greenhouse" | "lever" | "workable" | "ashby";

export type AtsTarget = {
  provider: AtsProvider;
  /** Employer board/organisation slug. */
  org: string;
  /** Posting identifier inside that board. */
  jobId: string;
  /** Whether we can submit this one end to end today. */
  supported: boolean;
  url: string;
};

function clean(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function detectAts(rawUrl: string | null | undefined): AtsTarget | null {
  const raw = clean(rawUrl);
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  // Greenhouse — boards.greenhouse.io/org/jobs/123456, job-boards.greenhouse.io/org/jobs/123456
  if (host.endsWith("greenhouse.io")) {
    const token = url.searchParams.get("token");
    const forOrg = url.searchParams.get("for");
    if (token) {
      return { provider: "greenhouse", org: clean(forOrg), jobId: token, supported: true, url: raw };
    }
    const jobsIndex = parts.indexOf("jobs");
    if (jobsIndex > 0 && parts[jobsIndex + 1]) {
      return { provider: "greenhouse", org: parts[0]!, jobId: parts[jobsIndex + 1]!, supported: true, url: raw };
    }
    return null;
  }

  // Lever — jobs.lever.co/org/<uuid>[/apply]
  if (host.endsWith("lever.co")) {
    const [org, id] = parts;
    if (org && id) return { provider: "lever", org, jobId: id, supported: true, url: raw };
    return null;
  }

  // Workable — apply.workable.com/org/j/CODE
  if (host.endsWith("workable.com")) {
    const jIndex = parts.indexOf("j");
    if (jIndex > 0 && parts[jIndex + 1]) {
      return { provider: "workable", org: parts[0]!, jobId: parts[jIndex + 1]!, supported: false, url: raw };
    }
    return null;
  }

  // Ashby — jobs.ashbyhq.com/org/<uuid>
  if (host.endsWith("ashbyhq.com")) {
    const [org, id] = parts;
    if (org && id) return { provider: "ashby", org, jobId: id, supported: false, url: raw };
    return null;
  }

  return null;
}

export const ATS_LABELS: Record<AtsProvider, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  workable: "Workable",
  ashby: "Ashby",
};
