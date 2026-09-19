import { AlertTriangle, CheckCircle2, GraduationCap, Languages, Lightbulb, MessageCircleQuestion, Sparkle, Briefcase, Award } from "lucide-react";

import { useI18n } from "@/lib/i18n/context";
import type { ParsedCv } from "@/lib/cv/schema";
import { Badge } from "@/components/ui/badge";

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-bold [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function List({ items, tone }: { items: string[]; tone: "good" | "warn" | "info" }) {
  if (!items.length) return null;
  const Icon = tone === "good" ? CheckCircle2 : tone === "warn" ? AlertTriangle : Lightbulb;
  const color = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : "text-primary";
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
          <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Read-only presentation of a parsed CV + its analysis. Nothing here writes data. */
export function CvReview({ cv }: { cv: ParsedCv }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-lg font-extrabold tracking-tight">{cv.full_name ?? "—"}</p>
        <p className="text-sm text-muted-foreground">
          {[cv.current_title, [cv.city, cv.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        </p>
        {cv.summary ? <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{cv.summary}</p> : null}
      </header>

      {cv.work_history.length > 0 && (
        <Block icon={<Briefcase />} title={t.cv.experience}>
          <div className="space-y-3">
            {cv.work_history.map((w, i) => (
              <div key={i} className="rounded-2xl border border-border/70 p-3">
                <p className="text-sm font-semibold">{w.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[w.company, w.location].filter(Boolean).join(" · ")}
                  {w.start_date ? ` · ${w.start_date} – ${w.is_current ? t.cv.present : (w.end_date ?? "")}` : ""}
                </p>
                {w.achievements.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-muted-foreground">
                    {w.achievements.slice(0, 4).map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Block>
      )}

      {cv.education.length > 0 && (
        <Block icon={<GraduationCap />} title={t.cv.education}>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {cv.education.map((e, i) => (
              <li key={i}>
                <span className="font-semibold text-foreground">{[e.degree, e.field].filter(Boolean).join(" — ")}</span>
                {` · ${e.institution}${e.end_year ? ` · ${e.end_year}` : ""}`}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {cv.skills.length > 0 && (
        <Block icon={<Sparkle />} title={t.cv.skills}>
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="rounded-full font-medium">
                {s.name}
              </Badge>
            ))}
          </div>
        </Block>
      )}

      {cv.languages.length > 0 && (
        <Block icon={<Languages />} title={t.cv.languages}>
          <p className="text-sm text-muted-foreground">
            {cv.languages.map((l) => [l.name, l.level].filter(Boolean).join(" — ")).join(" · ")}
          </p>
        </Block>
      )}

      {cv.certifications.length > 0 && (
        <Block icon={<Award />} title={t.cv.certifications}>
          <p className="text-sm text-muted-foreground">
            {cv.certifications.map((c) => [c.name, c.issuer, c.year].filter(Boolean).join(" — ")).join(" · ")}
          </p>
        </Block>
      )}

      {cv.analysis.strengths.length > 0 && (
        <Block icon={<CheckCircle2 />} title={t.cv.strengths}>
          <List items={cv.analysis.strengths} tone="good" />
        </Block>
      )}

      {(cv.analysis.gaps.length > 0 || cv.analysis.missing_sections.length > 0) && (
        <Block icon={<AlertTriangle />} title={t.cv.gaps}>
          <List items={[...cv.analysis.gaps, ...cv.analysis.missing_sections]} tone="warn" />
        </Block>
      )}

      {cv.analysis.ats_issues.length > 0 && (
        <Block icon={<AlertTriangle />} title={t.cv.atsIssues}>
          <List items={cv.analysis.ats_issues} tone="warn" />
        </Block>
      )}

      {cv.analysis.suggestions.length > 0 && (
        <Block icon={<Lightbulb />} title={t.cv.suggestions}>
          <List items={cv.analysis.suggestions} tone="info" />
        </Block>
      )}

      {cv.analysis.missing_questions.length > 0 && (
        <Block icon={<MessageCircleQuestion />} title={t.cv.questions}>
          <List items={cv.analysis.missing_questions} tone="info" />
        </Block>
      )}
    </div>
  );
}
