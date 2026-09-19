import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatNumber } from "@/lib/i18n/context";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Shoghlni | شغلني" },
      { name: "description", content: "Platform health: users, jobs, applications and AI usage." },
      { property: "og:title", content: "Admin — Shoghlni" },
      { property: "og:description", content: "Operations dashboard for the Shoghlni platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();

  const q = useQuery({
    queryKey: ["admin-overview", user.id],
    queryFn: async () => {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return { isAdmin: false as const };
      const count = { count: "exact" as const, head: true };
      const [users, jobs, apps, interviews, ai, collectors] = await Promise.all([
        supabase.from("profiles").select("user_id", count),
        supabase.from("jobs").select("id", count).eq("status", "active"),
        supabase.from("applications").select("id", count),
        supabase.from("interviews").select("id", count),
        supabase.from("ai_usage").select("id", count),
        supabase.from("job_collectors").select("name, last_status, last_run_at, is_active"),
      ]);
      return {
        isAdmin: true as const,
        users: users.count ?? 0,
        jobs: jobs.count ?? 0,
        applications: apps.count ?? 0,
        interviews: interviews.count ?? 0,
        aiRequests: ai.count ?? 0,
        collectors: collectors.data ?? [],
      };
    },
  });

  if (q.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!q.data?.isAdmin) return <EmptyState icon={<ShieldAlert />} title={t.admin.title} body={t.admin.noAccess} />;

  const stats = [
    { label: t.admin.users, value: q.data.users },
    { label: t.admin.jobs, value: q.data.jobs },
    { label: t.admin.applications, value: q.data.applications },
    { label: t.admin.interviews, value: q.data.interviews },
    { label: t.admin.aiRequests, value: q.data.aiRequests },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t.admin.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.subtitle}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="surface-card p-4">
            <div className="text-xs font-semibold text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-2xl font-extrabold tabular-nums">{formatNumber(s.value, locale)}</div>
          </div>
        ))}
      </div>

      <section className="surface-card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t.admin.sources}</h2>
        <ul className="divide-y divide-border text-sm">
          {q.data.collectors.map((c) => (
            <li key={c.name} className="flex items-center justify-between py-2">
              <span className="font-semibold">{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.last_status ?? "—"}</span>
            </li>
          ))}
          {q.data.collectors.length === 0 && <li className="py-2 text-muted-foreground">—</li>}
        </ul>
      </section>
    </div>
  );
}
