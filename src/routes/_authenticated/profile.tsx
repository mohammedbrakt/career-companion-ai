import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, LogOut, Settings2, Target, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatNumber } from "@/lib/i18n/context";
import { cvsQuery, preferencesQuery, profileQuery, targetsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { subscriptionQuery } from "@/lib/queries";
import { setTargetStatus } from "@/lib/profile.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Shoghlni | شغلني" },
      { name: "description", content: "Your career profile, targets, CVs and preferences." },
      { property: "og:title", content: "Profile — Shoghlni" },
      { property: "og:description", content: "Career profile, targets, documents and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold [&_svg]:size-4 [&_svg]:text-primary">{icon} {title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string | null | undefined }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={value ? "font-semibold" : "text-muted-foreground/70"}>{value ?? t.profile.notSet}</span>
    </div>
  );
}

function ProfilePage() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user.id));
  const prefs = useQuery(preferencesQuery(user.id));
  const targets = useQuery(targetsQuery(user.id));
  const cvs = useQuery(cvsQuery(user.id));
  const subscription = useQuery(subscriptionQuery(user.id));
  const updateTarget = useServerFn(setTargetStatus);

  async function decideTarget(targetId: string, status: "approved" | "removed") {
    await updateTarget({ data: { targetId, status } });
    await queryClient.invalidateQueries({ queryKey: ["targets", user.id] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (profile.isLoading) return <Skeleton className="h-96 rounded-3xl" />;
  const p = profile.data;
  const primary = targets.data?.find((x) => x.kind === "primary");
  const secondary = targets.data?.filter((x) => x.kind === "secondary") ?? [];
  const master = cvs.data?.find((c) => c.kind === "master");
  const proposed = targets.data?.filter((x) => x.status === "suggested") ?? [];
  const planNames = (subscription.data?.plan?.name ?? null) as { en?: string; ar?: string } | null;
  const planName = planNames?.[locale] ?? planNames?.en ?? null;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-navy text-xl font-extrabold text-navy-foreground">
          {(p?.full_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight">{p?.full_name ?? user.email}</h1>
          <p className="truncate text-sm text-muted-foreground">{p?.current_title ?? p?.email ?? user.email}</p>
        </div>
        <LanguageToggle />
      </header>

      <section className="surface-card p-5">
        <div className="mb-2 flex items-center justify-between text-sm font-bold">
          <span>{t.profile.strength}</span>
          <span className="tabular-nums">{formatNumber(p?.profile_strength ?? 0, locale)}%</span>
        </div>
        <Progress value={p?.profile_strength ?? 0} className="h-2" />
      </section>

      <Section icon={<UserRound />} title={t.profile.career}>
        <Row label={t.profile.currentRole} value={p?.current_title} />
        <Row label={t.profile.experience} value={p?.years_experience != null ? t.profile.years(Number(p.years_experience)) : null} />
      </Section>

      <Section icon={<Target />} title={t.profile.targets}>
        <Row label={t.profile.primaryTarget} value={primary?.title} />
        <Row label={t.profile.secondaryTargets} value={secondary.length ? secondary.map((s) => s.title).join("، ") : null} />
        <Row label={t.profile.countries} value={prefs.data?.target_countries?.length ? prefs.data.target_countries.join("، ") : null} />
        <Row label={t.profile.workMode} value={prefs.data?.work_arrangements?.length ? prefs.data.work_arrangements.map((w) => t.jobs[w]).join("، ") : null} />
      </Section>

      <Section icon={<FileText />} title={t.profile.documents}>
        <Row label={t.profile.masterCv} value={master?.title ?? null} />
        {!master && <p className="mb-2 text-xs text-muted-foreground">{t.profile.noCv}</p>}
        <Button asChild variant="outline" className="mt-2 h-11 w-full rounded-2xl">
          <Link to="/cv">
            <FileText className="size-4" /> {master ? t.cv.replace : t.cv.upload}
          </Link>
        </Button>
      </Section>

      <Section icon={<Target />} title={t.targets.title}>
        {proposed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.targets.empty}</p>
        ) : (
          <ul className="space-y-2">
            {proposed.map((target) => (
              <li key={target.id} className="flex items-center gap-2 rounded-2xl bg-muted/60 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{target.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{target.rationale ?? t.targets.proposed}</div>
                </div>
                <Button size="sm" className="rounded-xl" onClick={() => void decideTarget(target.id, "approved")}>{t.targets.approve}</Button>
                <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => void decideTarget(target.id, "removed")}>{t.targets.remove}</Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Settings2 />} title={t.plan.title}>
        <Row label={t.plan.title} value={planName} />
        <Row label={t.plan.trialEnds} value={subscription.data?.trial_ends_at ? new Date(subscription.data.trial_ends_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB") : null} />
        <p className="pt-1 text-xs text-muted-foreground">{t.plan.comingSoon}</p>
      </Section>

      <Section icon={<Settings2 />} title={t.profile.preferences}>
        <Row label={t.profile.applicationPermission} value={prefs.data?.application_permission === "trusted_auto" ? t.profile.trustedAuto : t.profile.approvalRequired} />
        
      </Section>

      <Button variant="outline" onClick={signOut} className="h-12 w-full rounded-2xl">
        <LogOut className="size-4" /> {t.auth.signOut}
      </Button>
    </div>
  );
}
