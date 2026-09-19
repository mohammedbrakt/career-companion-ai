import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkle } from "lucide-react";

import { agentStateQuery } from "@/lib/queries";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";

type Action = keyof Omit<ReturnType<typeof useI18n>["t"]["nextAction"], "title">;

const ROUTES: Record<Action, string> = {
  review_cv: "/cv",
  confirm_targets: "/profile",
  discover_jobs: "/jobs",
  review_jobs: "/jobs",
  prepare_application: "/applications",
  talk_to_agent: "/agent",
};

/** One-next-action principle: always a single, obvious next step. */
export function NextActionCard({ userId }: { userId: string }) {
  const { t, dir } = useI18n();
  const state = useQuery(agentStateQuery(userId));
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  const raw = (state.data?.next_action ?? null) as { action?: string; label?: string } | null;
  const action = (raw?.action && raw.action in ROUTES ? raw.action : "talk_to_agent") as Action;
  if (!state.data) return null;

  return (
    <section className="surface-card flex flex-wrap items-center gap-4 border-primary/20 bg-agent-soft/40 p-4">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkle className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.nextAction.title}</div>
        <div className="truncate font-bold">{t.nextAction[action]}</div>
      </div>
      <Button asChild className="h-11 rounded-2xl">
        <Link to={ROUTES[action]}>
          {t.nextAction[action]} <Arrow className="size-4" />
        </Link>
      </Button>
    </section>
  );
}
