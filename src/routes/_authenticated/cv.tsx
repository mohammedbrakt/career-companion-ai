import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileText, Loader2, MessageSquare, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { masterCvQuery, profileQuery } from "@/lib/queries";
import { applyCvToProfile, parseCvUpload } from "@/lib/cv.functions";
import type { ParsedCv } from "@/lib/cv/schema";
import { CvReview } from "@/components/cv/CvReview";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/cv")({
  head: () => ({
    meta: [
      { title: "CV & documents — Shoghlni | شغلني" },
      { name: "description", content: "Upload your CV and let your agent build a truthful Master CV and career profile." },
      { property: "og:title", content: "CV & documents — Shoghlni" },
      { property: "og:description", content: "Your Master CV, versions and AI review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CvPage,
});

const ACCEPT = ".pdf,.txt,.md,application/pdf,text/plain";

function CvPage() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "apply" | null>(null);
  const [draft, setDraft] = useState<{ versionId: string; parsed: ParsedCv } | null>(null);

  const cv = useQuery(masterCvQuery(user.id));
  const profile = useQuery(profileQuery(user.id));
  const parse = useServerFn(parseCvUpload);
  const apply = useServerFn(applyCvToProfile);

  const stored = cv.data?.current?.parsed_data as unknown as ParsedCv | undefined;
  const shown = draft?.parsed ?? stored ?? null;

  function errorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error);
    const key = Object.keys(t.cv.errors).find((k) => raw.includes(k)) as keyof typeof t.cv.errors | undefined;
    return key ? t.cv.errors[key] : t.cv.errors.generic;
  }

  async function onFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.cv.errors.generic);
      return;
    }
    setBusy("upload");
    setDraft(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("cvs").upload(path, file, { contentType: file.type || "application/pdf" });
      if (up.error) throw up.error;

      const result = await parse({ data: { filePath: path, fileType: file.type || "application/pdf", fileName: file.name } });
      setDraft({ versionId: result.versionId, parsed: result.parsed as ParsedCv });
      await queryClient.invalidateQueries({ queryKey: ["master-cv", user.id] });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function onApprove() {
    if (!draft) return;
    setBusy("apply");
    try {
      await apply({ data: { versionId: draft.versionId } });
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["master-cv", user.id] });
      toast.success(t.cv.approved);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-extrabold tracking-tight">{t.cv.title}</h1>
        <p className="text-sm text-muted-foreground">{t.cv.subtitle}</p>
      </header>

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />

      {busy === "upload" ? (
        <section className="surface-card flex items-center gap-3 p-5">
          <Loader2 className="size-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-bold">{t.cv.parsing}</p>
            <p className="text-xs text-muted-foreground">{t.cv.parsingHint}</p>
          </div>
        </section>
      ) : (
        <Button className="h-12 w-full rounded-2xl" onClick={() => fileInput.current?.click()}>
          <Upload className="size-4" />
          {cv.data ? t.cv.replace : t.cv.upload}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">{t.cv.uploadHint}</p>

      {cv.isLoading && <Skeleton className="h-64 rounded-3xl" />}

      {!cv.isLoading && !shown && busy !== "upload" && (
        <EmptyState icon={<FileText />} title={t.cv.noCv} body={t.cv.noCvBody} />
      )}

      {shown && (
        <section className="surface-card space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold">{t.cv.review}</h2>
              <p className="text-xs text-muted-foreground">{draft ? t.cv.reviewHint : t.cv.version(cv.data?.current?.version_no ?? 1)}</p>
            </div>
            {!draft && profile.data?.onboarding_completed ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="size-4" /> {t.cv.approved}
              </span>
            ) : null}
          </div>

          <CvReview cv={shown} />

          {draft && (
            <Button className="h-12 w-full rounded-2xl" onClick={onApprove} disabled={busy === "apply"}>
              {busy === "apply" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {t.cv.approve}
            </Button>
          )}

          <Button asChild variant="outline" className="h-11 w-full rounded-2xl">
            <Link to="/agent">
              <MessageSquare className="size-4" /> {t.agent.title}
            </Link>
          </Button>
        </section>
      )}
    </div>
  );
}
