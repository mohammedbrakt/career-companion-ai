/**
 * ATS submission adapters — the agent posts the application to the employer's
 * applicant tracking system exactly like their own hosted form does.
 * Every adapter is best-effort: if the ATS rejects or changes, we report it
 * and the user falls back to the manual flow. Nothing is ever submitted
 * without the user pressing the apply button.
 */
import { detectAts, type AtsTarget } from "@/lib/apply/ats";

export type SubmitCandidate = {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  coverLetter: string;
  resume: { bytes: Uint8Array; filename: string; contentType: string };
};

export type SubmitResult =
  | { status: "submitted"; provider: string }
  | { status: "unsupported"; provider: string | null; reason: string }
  | { status: "failed"; provider: string; reason: string };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function resumeBlob(candidate: SubmitCandidate) {
  return new Blob([candidate.resume.bytes as unknown as BlobPart], { type: candidate.resume.contentType });
}

async function submitGreenhouse(target: AtsTarget, c: SubmitCandidate): Promise<SubmitResult> {
  const form = new FormData();
  form.set("id", target.jobId);
  form.set("first_name", c.firstName);
  form.set("last_name", c.lastName);
  form.set("email", c.email);
  if (c.phone) form.set("phone", c.phone);
  if (c.location) form.set("job_application[location]", c.location);
  if (c.coverLetter) form.set("cover_letter_text", c.coverLetter);
  form.set("resume", resumeBlob(c), c.resume.filename);

  const res = await fetch(`https://boards.greenhouse.io/embed/job_app?token=${encodeURIComponent(target.jobId)}`, {
    method: "POST",
    headers: { "User-Agent": UA, Accept: "text/html,application/json" },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) return { status: "failed", provider: "greenhouse", reason: `http_${res.status}` };
  if (/captcha|recaptcha/i.test(body)) return { status: "unsupported", provider: "greenhouse", reason: "captcha" };
  if (/is required|error/i.test(body) && !/thank/i.test(body)) {
    return { status: "failed", provider: "greenhouse", reason: "extra_questions" };
  }
  return { status: "submitted", provider: "greenhouse" };
}

async function submitLever(target: AtsTarget, c: SubmitCandidate): Promise<SubmitResult> {
  const form = new FormData();
  form.set("name", c.fullName);
  form.set("email", c.email);
  if (c.phone) form.set("phone", c.phone);
  if (c.location) form.set("location", c.location);
  if (c.coverLetter) form.set("comments", c.coverLetter);
  form.set("resume", resumeBlob(c), c.resume.filename);

  const res = await fetch(`https://jobs.lever.co/${encodeURIComponent(target.org)}/${encodeURIComponent(target.jobId)}/apply`, {
    method: "POST",
    headers: { "User-Agent": UA, Accept: "application/json, text/html" },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) return { status: "failed", provider: "lever", reason: `http_${res.status}` };
  if (/captcha/i.test(body)) return { status: "unsupported", provider: "lever", reason: "captcha" };
  return { status: "submitted", provider: "lever" };
}

export async function submitToAts(applicationUrl: string | null | undefined, candidate: SubmitCandidate): Promise<SubmitResult> {
  const target = detectAts(applicationUrl);
  if (!target) return { status: "unsupported", provider: null, reason: "unknown_ats" };
  if (!target.supported) return { status: "unsupported", provider: target.provider, reason: "provider_not_supported" };
  if (!candidate.email) return { status: "unsupported", provider: target.provider, reason: "missing_email" };

  try {
    if (target.provider === "greenhouse") return await submitGreenhouse(target, candidate);
    if (target.provider === "lever") return await submitLever(target, candidate);
  } catch (error) {
    return { status: "failed", provider: target.provider, reason: error instanceof Error ? error.message : "network_error" };
  }
  return { status: "unsupported", provider: target.provider, reason: "provider_not_supported" };
}
