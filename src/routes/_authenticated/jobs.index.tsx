import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Briefcase, RefreshCw, Search, SlidersHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";

import { useI18n, formatDate } from "@/lib/i18n/context";
import { jobsFeedQuery } from "@/lib/queries";
import { discoverJobs } from "@/lib/jobs.functions";
import { detectAts } from "@/lib/apply/ats";
import { MatchScore } from "@/components/shared/MatchScore";
import { EmptyState } from "@/components/shared/EmptyState";
import { JobActions } from "@/components/jobs/JobActions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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

type Mode = "all" | "remote" | "hybrid" | "onsite";
type Sort = "score" | "date";

function JobsPage() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [mode, setMode] = useState<Mode>("all");
  const [country, setCountry] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<Sort>("score");
  const [discovering, setDiscovering] = useState(false);

  const feed = useQuery(jobsFeedQuery(user.id, search));
  const discover = useServerFn(discoverJobs);

  const countries = useMemo(
    () => [...new Set((feed.data ?? []).map((m) => m.job.country).filter((c): c is string => Boolean(c)))].sort(),
    [feed.data],
  );

  const rows = useMemo(() => {
    const list = (feed.data ?? []).filter((m) => {
      if (mode !== "all" && m.job.work_arrangement !== mode) return false;
      if (country !== "all" && m.job.country !== country) return false;
      if (m.score < minScore) return false;
      return true;
    });
    return list.sort((a, b) =>
      sort === "score" ? b.score - a.score : new Date(b.job.posted_at ?? 0).getTime() - new Date(a.job.posted_at ?? 0).getTime(),
    );
  }, [feed.data, mode, country, minScore, sort]);

  const onDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await discover({ data: undefined });
      await qc.invalidateQueries({ queryKey: ["jobs-feed", user.id] });
      await qc.invalidateQueries({ queryKey: ["dashboard", user.id] });
      toast.success(t.jobs.discovered(res.matches.scored));
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t.jobs.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.jobs.subtitle}</p>
        </div>
        <Button variant="outline" className="h-11 rounded-2xl" disabled={discovering} onClick={() => void onDiscover()}>
          <RefreshCw className={`size-4 ${discovering ? "animate-spin" : ""}`} />
          {discovering ? t.jobs.discovering : t.jobs.discover}
        </Button>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.jobs.search} className="h-12 rounded-2xl ps-10" />
        </div>
        <Button variant={showFilters ? "default" : "outline"} className="h-12 rounded-2xl" onClick={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">{t.jobs.filters}</span>
        </Button>
      </div>

      {showFilters && (
        <div className="surface-card grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder={t.jobs.anyMode} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.jobs.anyMode}</SelectItem>
              <SelectItem value="remote">{t.jobs.remote}</SelectItem>
              <SelectItem value="hybrid">{t.jobs.hybrid}</SelectItem>
              <SelectItem value="onsite">{t.jobs.onsite}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder={t.jobs.anyCountry} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.jobs.anyCountry}</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score">{t.jobs.sortScore}</SelectItem>
              <SelectItem value="date">{t.jobs.sortDate}</SelectItem>
            </SelectContent>
          </Select>

          <div>
            <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
              <span>{t.jobs.minScore}</span>
              <span className="tabular-nums">{minScore}%</span>
            </div>
            <Slider value={[minScore]} onValueChange={([v]) => setMinScore(v ?? 0)} max={100} step={5} />
          </div>
        </div>
      )}

      {feed.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : rows.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((m) => (
            <li key={m.id} className="surface-card p-4">
              <Link to="/jobs/$jobId" params={{ jobId: m.job.id }} className="flex items-center gap-4">
                <MatchScore score={m.score} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{m.job.title}</div>
                  <div className="truncate text-sm text-muted-foreground">{m.job.company} · {m.job.city ?? m.job.country}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    {m.job.work_arrangement && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{t.jobs[m.job.work_arrangement]}</span>}
                    {m.job.posted_at && <span className="rounded-full bg-muted px-2 py-0.5">{t.jobs.posted} {formatDate(m.job.posted_at, locale)}</span>}
                  </div>
                  {m.strengths.length > 0 && <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">{m.strengths[0]}</p>}
                </div>
              </Link>
              <div className="mt-3">
                <JobActions jobId={m.job.id} userId={user.id} applicationUrl={m.job.application_url} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Briefcase />} title={t.jobs.empty} body={t.jobs.emptyBody} />
      )}
    </div>
  );
}
