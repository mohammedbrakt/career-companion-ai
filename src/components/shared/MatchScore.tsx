import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/i18n/context";
import { useI18n } from "@/lib/i18n/context";

function tone(score: number) {
  if (score >= 85) return { ring: "text-success", label: "bg-success/10 text-success" };
  if (score >= 70) return { ring: "text-gold", label: "bg-gold/15 text-gold-foreground" };
  return { ring: "text-muted-foreground", label: "bg-muted text-muted-foreground" };
}

/** Circular match indicator. Sizes: sm (list), lg (detail). */
export function MatchScore({ score, size = "sm", className }: { score: number; size?: "sm" | "lg"; className?: string }) {
  const { locale } = useI18n();
  const r = size === "lg" ? 34 : 18;
  const stroke = size === "lg" ? 6 : 4;
  const c = 2 * Math.PI * r;
  const dash = c * (score / 100);
  const box = (r + stroke) * 2;
  const t = tone(score);
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: box, height: box }}>
      <svg width={box} height={box} className="-rotate-90">
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          className={cn("transition-all duration-700", t.ring)}
        />
      </svg>
      <span className={cn("absolute font-bold tabular-nums", size === "lg" ? "text-xl" : "text-[11px]")}>
        {formatNumber(score, locale)}%
      </span>
    </div>
  );
}

export function MatchBadge({ score }: { score: number }) {
  const { locale, t } = useI18n();
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", tone(score).label)}>
      {formatNumber(score, locale)}% {t.jobs.match}
    </span>
  );
}
