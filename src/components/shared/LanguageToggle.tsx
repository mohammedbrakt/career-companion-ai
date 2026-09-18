import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={next === "ar" ? t.common.arabic : t.common.english}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      <Languages className="size-3.5" />
      {next === "ar" ? t.common.arabic : t.common.english}
    </button>
  );
}
