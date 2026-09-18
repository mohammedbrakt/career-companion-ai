import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import type { Database } from "@/integrations/supabase/types";

type Stage = Database["public"]["Enums"]["application_stage"];

const stageTone: Record<Stage, string> = {
  found: "bg-muted text-muted-foreground",
  interested: "bg-agent-soft text-primary",
  approved: "bg-info/10 text-info",
  applied: "bg-info/15 text-info",
  viewed: "bg-gold/15 text-gold-foreground",
  interview: "bg-success/10 text-success",
  offer: "bg-success/20 text-success",
  closed: "bg-muted text-muted-foreground line-through",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", stageTone[stage], className)}>
      {t.applications.stages[stage]}
    </span>
  );
}
