import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, Search } from "lucide-react";
import { useI18n, formatDate } from "@/lib/i18n/context";
import { jobsFeedQuery } from "@/lib/queries";
import { MatchScore } from "@/components/shared/MatchScore";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({
    meta: [
      { title: "Jobs — Shoghlni | شغلني" },
      { name: "description", content: "Jobs screened and scored by your AI career agent." },
      { property: "og:title", content: "Jobs — Shoghlni" },
      { property: "og:description", content: "Every job your agent screened for you, with an explainable match score." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const feed = useQuery(jobsFeedQuery(user.id, search));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t.jobs.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.jobs.subtitle}</p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.jobs.search} className="h-12 rounded-2xl ps-10" />
      </div>

      {feed.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : feed.data && feed.data.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {feed.data.map((m) => (
            <li key={m.id}>
              <Link to="/jobs/$jobId" params={{ jobId: m.job.id }} className="surface-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <MatchScore score={m.score} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{m.job.title}</div>
                  <div className="truncate text-sm text-muted-foreground">{m.job.company} · {m.job.city ?? m.job.country}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    {m.job.work_arrangement && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{t.jobs[m.job.work_arrangement]}</span>}
                    {m.job.posted_at && <span className="rounded-full bg-muted px-2 py-0.5">{t.jobs.posted} {formatDate(m.job.posted_at, locale)}</span>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Briefcase />} title={t.jobs.empty} body={t.jobs.emptyBody} />
      )}
    </div>
  );
}
