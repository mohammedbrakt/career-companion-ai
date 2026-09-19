import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, ExternalLink, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { markInterested, saveJob, skipJob } from "@/lib/jobs.functions";
import { prepareApplication } from "@/lib/applications.functions";
import { detectAts } from "@/lib/apply/ats";
import { useI18n } from "@/lib/i18n/context";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REASONS = ["salary", "industry", "location", "too_junior", "too_senior", "company", "role", "other"] as const;

export function JobActions({
  jobId,
  userId,
  applicationUrl,
  size = "default",
}: {
  jobId: string;
  userId: string;
  applicationUrl?: string | null;
  size?: "default" | "sm";
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const prepare = useServerFn(prepareApplication);
  const interested = useServerFn(markInterested);
  const save = useServerFn(saveJob);
  const skip = useServerFn(skipJob);

  // True one-click apply only exists when the employer runs on a system our
  // agent can submit to directly (Greenhouse / Lever today).
  const canOneClick = detectAts(applicationUrl)?.supported ?? false;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["jobs-feed", userId] });
    void qc.invalidateQueries({ queryKey: ["dashboard", userId] });
    void qc.invalidateQueries({ queryKey: ["applications", userId] });
    void qc.invalidateQueries({ queryKey: ["job", jobId, userId] });
  };

  const onSave = async () => {
    await save({ data: { jobId } });
    track("job_saved", { job_id: jobId });
    toast.success(t.jobs.saved);
    invalidate();
  };

  const onSkip = async (reason: string) => {
    setOpen(false);
    await skip({ data: { jobId, reason } });
    track("job_rejected", { job_id: jobId, reason });
    invalidate();
  };

  const onOneClick = async () => {
    setApplying(true);
    try {
      const res = await interested({ data: { jobId } });
      track("job_interested", { job_id: jobId });
      if (!res.applicationId) throw new Error("no_application");
      try {
        await prepare({ data: { applicationId: res.applicationId } });
        track("application_prepared", { application_id: res.applicationId });
      } catch (error) {
        toast.error(error instanceof Error && error.message === "no_master_cv" ? t.cv.noCvBody : t.auth.genericError);
      }
      invalidate();
      void navigate({ to: "/applications/$applicationId", params: { applicationId: res.applicationId } });
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setApplying(false);
    }
  };

  const h = size === "sm" ? "h-9" : "h-12";

  return (
    <>
      <div className="flex items-center gap-2">
        {canOneClick ? (
          <Button className={`${h} min-w-0 flex-1 rounded-2xl bg-gold text-gold-foreground shadow hover:bg-gold/90`} disabled={applying} onClick={() => void onOneClick()}>
            <Sparkles className="size-4" /> <span className="truncate">{applying ? t.jobs.oneClickBusy : t.jobs.oneClick}</span>
          </Button>
        ) : applicationUrl ? (
          <Button asChild className={`${h} min-w-0 flex-1 rounded-2xl`}>
            <a href={applicationUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> <span className="truncate">{t.jobs.applyNow}</span>
            </a>
          </Button>
        ) : null}
        <Button variant="ghost" size={size === "sm" ? "icon-sm" : "icon"} className={`${h} w-auto shrink-0 rounded-2xl px-2 text-muted-foreground`} onClick={onSave} aria-label={t.jobs.save}>
          <Bookmark className="size-4" />
        </Button>
        <Button variant="ghost" size={size === "sm" ? "icon-sm" : "icon"} className={`${h} w-auto shrink-0 rounded-2xl px-2 text-muted-foreground`} onClick={() => setOpen(true)} aria-label={t.jobs.skip}>
          <X className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t.jobs.skipTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((reason) => (
              <Button key={reason} variant="outline" className="h-11 rounded-2xl text-sm" onClick={() => void onSkip(reason)}>
                {t.jobs.skipReasons[reason]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
