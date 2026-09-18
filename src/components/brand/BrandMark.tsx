import mark from "@/assets/shoghlni-mark.png";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";

export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src={mark}
      alt="Shoghlni"
      width={size}
      height={size}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}

export function BrandLockup({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, locale } = useI18n();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={compact ? 32 : 40} />
      <div className="leading-tight">
        <div className={cn("font-extrabold tracking-tight", compact ? "text-base" : "text-xl")}>
          {t.appName}
        </div>
        {!compact && (
          <div className="text-xs text-muted-foreground">{locale === "ar" ? "Shoghlni" : "شغلني"}</div>
        )}
      </div>
    </div>
  );
}
