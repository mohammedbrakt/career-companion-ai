import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KanbanSquare } from "lucide-react";
import { useI18n, formatNumber, formatDate } from "@/lib/i18n/context";
import { applicationsQuery } from "@/lib/queries";
import { StageBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({
    meta: [
      { title: "Applications — Shoghlni | شغلني" },
      { name: "description", content: "Track every application your agent prepared, from found to offer." },
      { property: "og:title", content: "Applications — Shoghlni" },
      { property: "og:description", content: "Your application pipeline, tracked by your AI agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplicationsPage,
});

const summaryStages = ["applied", "viewed", "interview", "offer"] as const;

function ApplicationsPage() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const apps = useQuery(applicationsQuery(user.id));

  const counts = summaryStages.map((s) => ({ s, n: (apps.data ?? []).filter((a) => a.stage === s).length }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t.applications.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.applications.subtitle}</p>
      </header>

      <div className="grid grid-cols-4 gap-2">
        {counts.map(({ s, n }) => (
          <div key={s} className="surface-card p-3 text-center">
            <div className="text-xl font-extrabold tabular-nums">{formatNumber(n, locale)}</div>
            <div className="text-[11px] font-semibold text-muted-foreground">{t.applications.stages[s]}</div>
          </div>
        ))}
      </div>

      {apps.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : apps.data && apps.data.length > 0 ? (
        <ul className="space-y-3">
          {apps.data.map((a) => (
            <li key={a.id} className="surface-card flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{a.job?.title}</div>
                <div className="truncate text-sm text-muted-foreground">{a.job?.company} · {a.job?.city ?? a.job?.country}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatDate(a.applied_at ?? a.created_at, locale)}</div>
              </div>
              <StageBadge stage={a.stage} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<KanbanSquare />} title={t.applications.empty} body={t.applications.emptyBody} />
      )}
    </div>
  );
}
