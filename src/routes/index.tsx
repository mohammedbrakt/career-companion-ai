import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/hooks/useSession";
import { BrandLockup } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { MatchScore } from "@/components/shared/MatchScore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shoghlni | شغلني — Your AI Career Agent" },
      { name: "description", content: "Shoghlni finds, matches and prepares the right jobs for you across Egypt, the Gulf and MENA." },
      { property: "og:title", content: "Shoghlni | شغلني — Your AI Career Agent" },
      { property: "og:description", content: "Hire an AI employee to run your job search: matched jobs, tailored CVs, tracked applications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, locale, dir } = useI18n();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  const bullets =
    locale === "ar"
      ? ["يبحث في آلاف الوظائف بدلاً منك", "يشرح لك لماذا تناسبك كل وظيفة", "يجهّز سيرتك وطلبك ويتابع كل شيء"]
      : ["Searches thousands of jobs for you", "Explains exactly why each job fits", "Prepares your CV and tracks every application"];

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <BrandLockup />
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/auth">{t.auth.signIn}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:items-center md:pt-14">
        <section className="animate-fade-up">
          <span className="inline-flex items-center rounded-full bg-agent-soft px-3 py-1 text-xs font-semibold text-primary">
            {t.tagline}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-balance md:text-5xl">
            {locale === "ar" ? "أنا بحثت في ١٠٠٠ وظيفة عشانك. دول الـ٣ اللي يستاهلوا وقتك." : "I already searched 1,000 jobs for you. These 3 are worth your attention."}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{t.auth.subtitle}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm font-medium">
                <CheckCircle2 className="size-4 text-success" /> {b}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-2xl px-6 text-base">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t.auth.signUp} <Arrow className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl px-6 text-base sm:hidden">
              <Link to="/auth">{t.auth.signIn}</Link>
            </Button>
          </div>
        </section>

        <section className="navy-panel relative overflow-hidden p-6 shadow-card animate-fade-up md:p-8" style={{ animationDelay: "120ms" }}>
          <div className="text-xs font-semibold uppercase tracking-wider text-navy-foreground/60">
            {locale === "ar" ? "مثال من الوكيل" : "From your agent"}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-navy-foreground/90">
            {locale === "ar"
              ? "محمد، لقيتلك اليوم 3 وظائف فوق 85%. أقوى واحدة Operations Director في دبي بنسبة تطابق 92%. تحب أشوفلك ليه مناسبة؟"
              : "Mohammed, I found 3 jobs above 85% today. The strongest is Operations Director in Dubai at 92%. Want me to explain why it fits?"}
          </p>
          <div className="mt-5 rounded-2xl bg-surface-elevated p-4 text-foreground shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">Operations Director</div>
                <div className="text-sm text-muted-foreground">XYZ Logistics · {locale === "ar" ? "دبي" : "Dubai"}</div>
              </div>
              <MatchScore score={92} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              {(locale === "ar" ? ["✓ قيادة العمليات", "✓ خبرة MENA", "⚠ SAP غير مذكور"] : ["✓ Operations leadership", "✓ MENA experience", "⚠ SAP not shown"]).map((x) => (
                <span key={x} className="rounded-full bg-muted px-2.5 py-1 font-medium">{x}</span>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
