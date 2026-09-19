import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowRight, Briefcase, CalendarCheck, Gauge, Sparkle } from "lucide-react";
import { useI18n, formatNumber, formatDate } from "@/lib/i18n/context";
import { dashboardQuery, profileQuery } from "@/lib/queries";
import { MatchScore } from "@/components/shared/MatchScore";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { BrandMark } from "@/components/brand/BrandMark";
import { NextActionCard } from "@/components/agent/NextActionCard";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Shoghlni | شغلني" },
      { name: "description", content: "Your career command center: matches, applications and agent activity." },
      { property: "og:title", content: "Home — Shoghlni" },
      { property: "og:description", content: "What your AI career agent did for you today." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function HomePage() {
  const { user } = Route.useRouteContext();
  const { t, locale, dir } = useI18n();
  const profile = useQuery(profileQuery(user.id));
  const dash = useQuery(dashboardQuery(user.id));
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const firstName = profile.data?.full_name?.split(" ")[0] ?? "";
  const onboarded = profile.data?.onboarding_completed ?? false;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {t.greeting[greetingKey()]}{firstName ? `، ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.home.summary}</p>
        </div>
        <LanguageToggle className="md:hidden" />
      </header>

      {profile.isLoading ? (
        <Skeleton className="h-36 rounded-3xl" />
      ) : !onboarded ? (
        <section className="navy-panel relative overflow-hidden p-6 animate-fade-up">
          <BrandMark size={72} className="absolute -end-3 -top-3 opacity-15" />
          <h2 className="text-xl font-extrabold">{t.home.onboardingTitle}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-navy-foreground/80">{t.home.onboardingBody}</p>
          <Button asChild variant="secondary" className="mt-5 h-11 rounded-2xl bg-gold text-gold-foreground hover:bg-gold/90">
            <Link to="/agent">
              {t.home.startOnboarding} <Arrow className="size-4" />
            </Link>
          </Button>
        </section>
      ) : (
        <NextActionCard userId={user.id} />
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {dash.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <StatCard icon={<Sparkle />} label={t.home.newMatches} value={formatNumber(dash.data?.newMatchesCount ?? 0, locale)} hint={t.home.strongJobsToday(dash.data?.newMatchesCount ?? 0)} />
            <StatCard icon={<Briefcase />} label={t.home.activeApplications} value={formatNumber(dash.data?.activeApplications ?? 0, locale)} hint={t.home.active} />
            <StatCard icon={<CalendarCheck />} label={t.home.interviews} value={formatNumber(dash.data?.upcomingInterviews ?? 0, locale)} hint={t.home.upcoming} />
            <StatCard icon={<Gauge />} label={t.home.profileStrength} value={`${formatNumber(profile.data?.profile_strength ?? 0, locale)}%`} />
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold">{t.home.topMatches}</h2>
        {dash.isLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : dash.data && dash.data.topMatches.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {dash.data.topMatches.map((m) => (
              <Link key={m.id} to="/jobs/$jobId" params={{ jobId: m.job!.id }} className="surface-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <MatchScore score={m.score} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{m.job?.title}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {m.job?.company} · {m.job?.city ?? m.job?.country}
                  </div>
                  {m.strengths?.[0] && <div className="mt-1 truncate text-xs text-success">✓ {m.strengths[0]}</div>}
                </div>
                <Arrow className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Sparkle />} title={t.home.noMatches} body={t.home.noMatchesBody} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold">{t.home.agentActivity}</h2>
        <div className="surface-card divide-y divide-border">
          {dash.isLoading ? (
            <div className="p-4"><Skeleton className="h-5 w-2/3" /></div>
          ) : dash.data && dash.data.activity.length > 0 ? (
            dash.data.activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-agent-soft text-primary">
                  <Activity className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{a.description ?? a.event_type}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(a.occurred_at, locale)}</div>
                </div>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t.home.noActivity}</p>
          )}
        </div>
      </section>
    </div>
  );
}
