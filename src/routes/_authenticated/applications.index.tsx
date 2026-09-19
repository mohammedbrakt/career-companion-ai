import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { KanbanSquare, List } from "lucide-react";

import { useI18n, formatNumber, formatDate } from "@/lib/i18n/context";
import { applicationsQuery } from "@/lib/queries";
import { StageBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
const boardStages = ["interested", "approved", "applied", "interview", "offer", "closed"] as const;

function ApplicationsPage() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const [view, setView] = useState<"list" | "board">("list");
  const apps = useQuery(applicationsQuery(user.id));
  const data = apps.data ?? [];

  const counts = summaryStages.map((s) => ({ s, n: data.filter((a) => a.stage === s).length }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t.applications.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.applications.subtitle}</p>
        </div>
        <div className="flex gap-1 rounded-2xl bg-muted p-1">
          <Button size="sm" variant={view === "list" ? "default" : "ghost"} className="rounded-xl" onClick={() => setView("list")}>
            <List className="size-4" /> {t.applications.list}
          </Button>
          <Button size="sm" variant={view === "board" ? "default" : "ghost"} className="rounded-xl" onClick={() => setView("board")}>
            <KanbanSquare className="size-4" /> {t.applications.board}
          </Button>
        </div>
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
      ) : data.length === 0 ? (
        <EmptyState icon={<KanbanSquare />} title={t.applications.empty} body={t.applications.emptyBody} />
      ) : view === "list" ? (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id}>
              <Link to="/applications/$applicationId" params={{ applicationId: a.id }} className="surface-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{a.job?.title}</div>
                  <div className="truncate text-sm text-muted-foreground">{a.job?.company} · {a.job?.city ?? a.job?.country}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(a.applied_at ?? a.created_at, locale)}</div>
                </div>
                <StageBadge stage={a.stage} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {boardStages.map((stage) => {
            const items = data.filter((a) => a.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-bold">{t.applications.stages[stage]}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatNumber(items.length, locale)}</span>
                </div>
                <div className="space-y-2 rounded-2xl bg-muted/50 p-2">
                  {items.map((a) => (
                    <Link
                      key={a.id}
                      to="/applications/$applicationId"
                      params={{ applicationId: a.id }}
                      className="surface-card block p-3"
                    >
                      <div className="truncate text-sm font-bold">{a.job?.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.job?.company}</div>
                    </Link>
                  ))}
                  {items.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
