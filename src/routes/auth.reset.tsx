import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { BrandLockup } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth/reset")({
  head: () => ({
    meta: [
      { title: "Reset password — Shoghlni | شغلني" },
      { name: "description", content: "Choose a new password for your Shoghlni account." },
      { property: "og:title", content: "Reset password — Shoghlni" },
      { property: "og:description", content: "Choose a new password for your Shoghlni account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.auth.passwordUpdated);
    navigate({ to: "/home", replace: true });
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm animate-fade-up">
        <BrandLockup className="mb-8" />
        <h1 className="text-2xl font-extrabold">{t.auth.newPassword}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">{t.auth.newPassword}</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" dir="ltr" />
          </div>
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl text-base">
            {t.auth.updatePassword}
          </Button>
        </form>
      </div>
    </div>
  );
}
