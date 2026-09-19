import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatDate } from "@/lib/i18n/context";
import { MatchScore } from "@/components/shared/MatchScore";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { JobActions } from "@/components/jobs/JobActions";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job details — Shoghlni | شغلني" },
      { name: "description", content: "Match breakdown, strengths, gaps and next action for this job." },
      { property: "og:title", content: "Job details — Shoghlni" },
      { property: "og:description", content: "Explainable match score for this role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobDetail,
});

const dimensions = ["experience", "skills", "industry", "education", "location", "seniority"] as const;
const dimLabels: Record<"ar" | "en", Record<(typeof dimensions)[number], string>> = {
  en: { experience: "Experience", skills: "Skills", industry: "Industry", education: "Education", location: "Location", seniority: "Seniority" },
  ar: { experience: "الخبرة", skills: "المهارات", industry: "المجال", education: "التعليم", location: "الموقع", seniority: "المستوى" },
};

function JobDetail() {
  const { jobId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { t, locale, dir } = useI18n();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  const q = useQuery({
    queryKey: ["job", jobId, user.id],
    queryFn: async () => {
      const [job, match] = await Promise.all([
        supabase.from("jobs").select("*").eq("id", jobId).single(),
        supabase.from("user_job_matches").select("*").eq("job_id", jobId).eq("user_id", user.id).maybeSingle(),
      ]);
      if (job.error) throw job.error;
      return { job: job.data, match: match.data };
    },
  });

  if (q.isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  if (!q.data) return null;
  const { job, match } = q.data;
  const breakdown = (match?.breakdown ?? {}) as Partial<Record<(typeof dimensions)[number], number>>;

  return (
    <div className="space-y-5">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <Back className="size-4" /> {t.common.back}
      </Link>

      <header className="surface-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{job.title}</h1>
            <p className="mt-1 text-muted-foreground">{job.company} · {job.city ?? job.country}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
              {job.work_arrangement && <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{t.jobs[job.work_arrangement]}</span>}
              {job.posted_at && <span className="rounded-full bg-muted px-2.5 py-1">{t.jobs.posted} {formatDate(job.posted_at, locale)}</span>}
              {job.last_verified_at && <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">{t.jobs.verified} {formatDate(job.last_verified_at, locale)}</span>}
            </div>
          </div>
          {match && <MatchScore score={match.score} size="lg" />}
        </div>
      </header>

      {match && (
        <section className="surface-card p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {dimensions.map((d) =>
              breakdown[d] == null ? null : (
                <div key={d}>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span>{dimLabels[locale][d]}</span>
                    <span className="tabular-nums text-muted-foreground">{breakdown[d]}</span>
                  </div>
                  <Progress value={breakdown[d]} className="h-1.5" />
                </div>
              ),
            )}
          </div>
          {match.strengths.length > 0 && (
            <ul className="mt-5 space-y-1.5 text-sm">
              {match.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> {s}</li>
              ))}
            </ul>
          )}
          {match.gaps.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {match.gaps.map((g) => (
                <li key={g} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {g}</li>
              ))}
            </ul>
          )}
          {match.recommendation && <p className="mt-4 rounded-2xl bg-agent-soft p-3 text-sm">{match.recommendation}</p>}
        </section>
      )}

      {job.description && (
        <section className="surface-card p-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{job.description}</p>
        </section>
      )}

      <div className="sticky bottom-24 space-y-2 md:static">
        <JobActions jobId={job.id} userId={user.id} />
        {job.application_url && (
          <Button asChild variant="outline" className="h-11 w-full rounded-2xl">
            <a href={job.application_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> {t.jobs.view}</a>
          </Button>
        )}
      </div>
    </div>
  );
}
