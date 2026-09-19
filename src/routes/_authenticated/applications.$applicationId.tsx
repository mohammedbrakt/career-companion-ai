import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Bot, Building2, Copy, Download, ExternalLink, FileText, MessageSquareQuote, Sparkle, User, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatDate } from "@/lib/i18n/context";
import { prepareApplication, prepareInterview, setApplicationStage } from "@/lib/applications.functions";
import { printApplicationDocuments } from "@/lib/cv/print";
import { buildAutofillBookmarklet, splitName } from "@/lib/apply/autofill";
import { track } from "@/lib/analytics";
import { StageBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/applications/$applicationId")({
  head: () => ({
    meta: [
      { title: "Application — Shoghlni | شغلني" },
      { name: "description", content: "Your tailored CV, cover letter, answers and full application history." },
      { property: "og:title", content: "Application — Shoghlni" },
      { property: "og:description", content: "Everything your agent prepared for this job." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplicationDetail,
});

type Prepared = {
  summary?: string;
  headline?: string;
  highlighted_skills?: string[];
  tailored_bullets?: Array<{ company: string; title: string; bullets: string[] }>;
  cover_letter?: string;
  answers?: Array<{ question: string; answer: string }>;
  notes_for_user?: string[];
};

type Prep = {
  questions?: Array<{ question: string; why: string; strong_answer_outline: string }>;
  gaps_to_address?: string[];
  company_notes?: string[];
  star_practice?: string[];
};

const actorIcon = { agent: Bot, user: User, employer: Building2, system: Sparkle } as const;

function ApplicationDetail() {
  const { applicationId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { t, locale, dir } = useI18n();
  const qc = useQueryClient();
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [busy, setBusy] = useState<"prepare" | "interview" | null>(null);

  const prepare = useServerFn(prepareApplication);
  const interviewPrep = useServerFn(prepareInterview);
  const setStage = useServerFn(setApplicationStage);

  const q = useQuery({
    queryKey: ["application", applicationId, user.id],
    queryFn: async () => {
      const app = await supabase
        .from("applications")
        .select("*, job:jobs(id, title, company, city, country, application_url, work_arrangement)")
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .single();
      if (app.error) throw app.error;
      const [events, version, interviews, profile] = await Promise.all([
        supabase.from("application_events").select("*").eq("application_id", applicationId).order("occurred_at", { ascending: false }),
        app.data.cv_version_id
          ? supabase.from("cv_versions").select("id, version_no, content").eq("id", app.data.cv_version_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("interviews").select("id, prep, scheduled_at").eq("application_id", applicationId),
        supabase.from("profiles").select("full_name, email, phone, city, country, headline").eq("user_id", user.id).maybeSingle(),
      ]);
      return {
        app: app.data,
        events: events.data ?? [],
        version: version.data,
        interviews: interviews.data ?? [],
        profile: profile.data,
      };
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["application", applicationId, user.id] });
    void qc.invalidateQueries({ queryKey: ["applications", user.id] });
  };

  if (q.isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  if (!q.data) return null;
  const { app, events, version, interviews, profile } = q.data;
  const prepared = (version?.content ?? null) as Prepared | null;
  const prep = (interviews.find((i) => i.prep)?.prep ?? null) as Prep | null;

  const onPrepare = async () => {
    setBusy("prepare");
    try {
      await prepare({ data: { applicationId } });
      toast.success(t.applications.prepared);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error && error.message === "no_master_cv" ? t.cv.noCvBody : t.auth.genericError);
    } finally {
      setBusy(null);
    }
  };

  const onInterviewPrep = async () => {
    setBusy("interview");
    try {
      await interviewPrep({ data: { applicationId } });
      refresh();
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setBusy(null);
    }
  };

  const move = async (stage: "applied" | "interview" | "offer" | "closed") => {
    await setStage({ data: { applicationId, stage, note: null, closedReason: stage === "closed" ? "withdrawn" : null } });
    toast.success(t.applications.stageUpdated);
    refresh();
  };

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(t.applications.copied);
  };

  const onApplied = async () => {
    track("application_submitted", { application_id: applicationId });
    if (app.stage !== "applied") {
      await setStage({ data: { applicationId, stage: "applied", note: null, closedReason: null } });
      toast.success(t.applications.appliedMarked);
      refresh();
    }
  };

  const { firstName, lastName } = splitName(profile?.full_name ?? "");
  const bookmarklet = buildAutofillBookmarklet({
    fullName: profile?.full_name ?? "",
    firstName,
    lastName,
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
    city: profile?.city ?? "",
    country: profile?.country ?? "",
    headline: prepared?.headline ?? profile?.headline ?? "",
    coverLetter: prepared?.cover_letter ?? "",
    answers: prepared?.answers ?? [],
  });

  const onDownload = () => {
    const ok = printApplicationDocuments({
      fullName: profile?.full_name ?? "",
      contact: [profile?.email, profile?.phone, [profile?.city, profile?.country].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
      jobTitle: app.job?.title ?? "",
      company: app.job?.company ?? "",
      headline: prepared?.headline ?? profile?.headline ?? undefined,
      summary: prepared?.summary ?? undefined,
      skills: prepared?.highlighted_skills ?? undefined,
      bullets: prepared?.tailored_bullets ?? undefined,
      coverLetter: prepared?.cover_letter ?? undefined,
      dir,
    });
    if (!ok) toast.error(t.applications.popupBlocked);
  };

  return (
    <div className="space-y-5">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <Back className="size-4" /> {t.common.back}
      </Link>

      <header className="surface-card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{app.job?.title}</h1>
          <p className="mt-1 text-muted-foreground">{app.job?.company} · {app.job?.city ?? app.job?.country}</p>
          <p className="mt-2 text-xs text-muted-foreground">{formatDate(app.applied_at ?? app.created_at, locale)}</p>
        </div>
        <StageBadge stage={app.stage} />
      </header>

      <section className="surface-card space-y-3 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.applications.applyTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {busy === "prepare"
            ? t.applications.applyPreparing
            : prepared
              ? app.job?.application_url
                ? t.applications.applyReady
                : t.applications.noApplyLink
              : t.applications.applyNotReady}
        </p>

        {!prepared ? (
          <Button className="h-12 w-full rounded-2xl text-base sm:w-auto" disabled={busy === "prepare"} onClick={() => void onPrepare()}>
            <Sparkle className="size-4" /> {busy === "prepare" ? t.applications.preparing : t.applications.prepare}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {app.job?.application_url && (
              <Button asChild className="h-12 rounded-2xl text-base">
                <a href={app.job.application_url} target="_blank" rel="noreferrer" onClick={() => void onApplied()}>
                  <ExternalLink className="size-4" /> {t.applications.applyNow}
                </a>
              </Button>
            )}
            {prepared.cover_letter && (
              <Button variant="outline" className="h-12 rounded-2xl" onClick={() => copy(prepared.cover_letter ?? "")}>
                <Copy className="size-4" /> {t.applications.copyCover}
              </Button>
            )}
            {prepared.answers && prepared.answers.length > 0 && (
              <Button
                variant="outline"
                className="h-12 rounded-2xl"
                onClick={() => copy((prepared.answers ?? []).map((a) => `${a.question}\n${a.answer}`).join("\n\n"))}
              >
                <Copy className="size-4" /> {t.applications.copyAnswers}
              </Button>
            )}
            <Button variant="outline" className="h-12 rounded-2xl" onClick={onDownload}>
              <Download className="size-4" /> {t.applications.downloadCv}
            </Button>
            <Button variant="ghost" className="h-12 rounded-2xl" disabled={busy === "prepare"} onClick={() => void onPrepare()}>
              <FileText className="size-4" /> {t.applications.prepare}
            </Button>
          </div>
        )}

        {prepared && (
          <div className="hidden rounded-2xl border border-dashed border-border p-4 md:block">
            <div className="text-sm font-bold">{t.applications.autofillTitle}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t.applications.autofillHow}</p>
            <a
              href={bookmarklet}
              draggable
              onClick={(e) => e.preventDefault()}
              title={t.applications.autofillDragHint}
              className="mt-3 inline-flex h-11 cursor-grab items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-soft"
            >
              <Wand2 className="size-4" /> {t.applications.autofillButton}
            </a>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void move("applied")}>{t.applications.markApplied}</Button>
        <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void move("interview")}>{t.applications.markInterview}</Button>
        <Button variant="outline" className="h-11 rounded-2xl" onClick={() => void move("offer")}>{t.applications.markOffer}</Button>
      </div>

      {prepared && (
        <section className="surface-card space-y-4 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.applications.documents}</h2>
          {prepared.headline && <p className="font-semibold">{prepared.headline}</p>}
          {prepared.summary && <p className="text-sm leading-relaxed text-foreground/90">{prepared.summary}</p>}
          {prepared.highlighted_skills && prepared.highlighted_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {prepared.highlighted_skills.map((s) => (
                <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{s}</span>
              ))}
            </div>
          )}
          {prepared.tailored_bullets?.map((entry) => (
            <div key={`${entry.company}-${entry.title}`}>
              <div className="text-sm font-bold">{entry.title} · {entry.company}</div>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-foreground/90">
                {entry.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
          ))}
          {prepared.cover_letter && (
            <div>
              <div className="mb-1 text-sm font-bold">{t.applications.coverLetter}</div>
              <p className="whitespace-pre-line rounded-2xl bg-muted/60 p-3 text-sm leading-relaxed">{prepared.cover_letter}</p>
            </div>
          )}
          {prepared.answers && prepared.answers.length > 0 && (
            <div>
              <div className="mb-1 text-sm font-bold">{t.applications.answers}</div>
              <ul className="space-y-2 text-sm">
                {prepared.answers.map((a) => (
                  <li key={a.question}><span className="font-semibold">{a.question}</span><br />{a.answer}</li>
                ))}
              </ul>
            </div>
          )}
          {prepared.notes_for_user && prepared.notes_for_user.length > 0 && (
            <ul className="space-y-1 rounded-2xl bg-warning/10 p-3 text-sm text-foreground/90">
              {prepared.notes_for_user.map((n) => <li key={n}>⚠ {n}</li>)}
            </ul>
          )}
        </section>
      )}

      <section className="surface-card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.applications.interviewPrep}</h2>
          <Button size="sm" variant="outline" className="rounded-xl" disabled={busy === "interview"} onClick={() => void onInterviewPrep()}>
            <MessageSquareQuote className="size-4" /> {busy === "interview" ? t.applications.preparing : t.applications.prepare}
          </Button>
        </div>
        {prep?.questions?.length ? (
          <div className="space-y-3">
            <div className="text-sm font-bold">{t.applications.prepQuestions}</div>
            <ul className="space-y-2 text-sm">
              {prep.questions.map((question) => (
                <li key={question.question} className="rounded-2xl bg-muted/60 p-3">
                  <div className="font-semibold">{question.question}</div>
                  <div className="mt-1 text-muted-foreground">{question.why}</div>
                  <div className="mt-1">{question.strong_answer_outline}</div>
                </li>
              ))}
            </ul>
            {prep.gaps_to_address?.length ? (
              <ul className="space-y-1 text-sm">{prep.gaps_to_address.map((g) => <li key={g}>⚠ {g}</li>)}</ul>
            ) : null}
            {prep.company_notes?.length ? (
              <ul className="space-y-1 text-sm text-muted-foreground">{prep.company_notes.map((c) => <li key={c}>• {c}</li>)}</ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.applications.prepTips}</p>
        )}
      </section>

      <section className="surface-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.applications.timeline}</h2>
        <ul className="space-y-3">
          {events.map((event) => {
            const Icon = actorIcon[event.actor];
            const label =
              event.actor === "agent" ? t.applications.agentAction : event.actor === "employer" ? t.applications.employerAction : t.applications.userAction;
            return (
              <li key={event.id} className="flex gap-3 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="font-medium">{event.description ?? event.event_type}</div>
                  <div className="text-xs text-muted-foreground">{label} · {formatDate(event.occurred_at, locale)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
