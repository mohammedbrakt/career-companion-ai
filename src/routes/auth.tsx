import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n/context";
import { useSession } from "@/hooks/useSession";
import { BrandLockup } from "@/components/brand/BrandMark";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";

const searchSchema = z.object({ mode: z.enum(["signin", "signup", "forgot"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Shoghlni | شغلني" },
      { name: "description", content: "Sign in to Shoghlni, your AI career agent." },
      { property: "og:title", content: "Sign in — Shoghlni" },
      { property: "og:description", content: "Access your AI career agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.4 14.7 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12S6.7 21.6 12 21.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.3 1.2 9.7.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.3 1.3-2.6 1.3-2.7 0 0-2.6-1-2.6-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.4z" />
    </svg>
  );
}

function AuthPage() {
  const { t, locale } = useI18n();
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  async function oauth(provider: "google" | "apple") {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(t.auth.genericError);
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home", replace: true });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        toast.success(t.auth.resetSent);
        navigate({ to: "/auth", search: { mode: "signin" } });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, locale }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          await track("signup_completed", { method: "email" });
          navigate({ to: "/home", replace: true });
        } else {
          toast.success(t.auth.checkEmail);
          navigate({ to: "/auth", search: { mode: "signin" } });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signup" ? t.auth.signUp : mode === "forgot" ? t.auth.forgot : t.auth.signIn;

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-2">
      <aside className="navy-panel hidden rounded-none p-12 md:flex md:flex-col md:justify-between">
        <BrandLockup className="text-navy-foreground" />
        <div>
          <h2 className="text-3xl font-extrabold leading-tight text-balance">{t.auth.welcome}</h2>
          <p className="mt-3 max-w-sm text-navy-foreground/75">{t.auth.subtitle}</p>
        </div>
        <div className="text-xs text-navy-foreground/50">© {new Date().getFullYear()} Shoghlni</div>
      </aside>

      <div className="flex min-h-dvh flex-col px-5 py-6 md:justify-center md:px-16">
        <div className="mb-8 flex items-center justify-between md:hidden">
          <BrandLockup compact />
          <LanguageToggle />
        </div>
        <div className="mx-auto w-full max-w-sm animate-fade-up">
          <div className="hidden justify-end md:flex">
            <LanguageToggle />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.auth.subtitle}</p>

          {mode !== "forgot" && (
            <div className="mt-6 grid gap-2.5">
              <Button type="button" variant="outline" className="h-12 rounded-2xl text-sm" disabled={busy} onClick={() => oauth("google")}>
                <GoogleIcon /> {t.auth.continueGoogle}
              </Button>
              <Button type="button" variant="outline" className="h-12 rounded-2xl text-sm" disabled={busy} onClick={() => oauth("apple")}>
                <AppleIcon /> {t.auth.continueApple}
              </Button>
              <div className="my-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> {t.auth.or} <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t.auth.fullName}</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 rounded-xl" autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" autoComplete="email" dir="ltr" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t.auth.password}</Label>
                  {mode === "signin" && (
                    <Link to="/auth" search={{ mode: "forgot" }} className="text-xs font-semibold text-primary hover:underline">
                      {t.auth.forgot}
                    </Link>
                  )}
                </div>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" autoComplete={mode === "signup" ? "new-password" : "current-password"} dir="ltr" />
              </div>
            )}
            <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl text-base">
              {mode === "forgot" ? t.auth.sendReset : title}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "forgot" ? (
              <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-primary hover:underline">{t.auth.backToSignIn}</Link>
            ) : mode === "signup" ? (
              <>
                {t.auth.haveAccount}{" "}
                <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-primary hover:underline">{t.auth.signIn}</Link>
              </>
            ) : (
              <>
                {t.auth.noAccount}{" "}
                <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-primary hover:underline">{t.auth.signUp}</Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
