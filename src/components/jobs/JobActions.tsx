import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Check, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { markInterested, saveJob, skipJob } from "@/lib/jobs.functions";
import { prepareApplication } from "@/lib/applications.functions";
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

export function JobActions({ jobId, userId, size = "default" }: { jobId: string; userId: string; size?: "default" | "sm" }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const prepare = useServerFn(prepareApplication);
  const interested = useServerFn(markInterested);
  const save = useServerFn(saveJob);
  const skip = useServerFn(skipJob);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["jobs-feed", userId] });
    void qc.invalidateQueries({ queryKey: ["dashboard", userId] });
    void qc.invalidateQueries({ queryKey: ["applications", userId] });
    void qc.invalidateQueries({ queryKey: ["job", jobId, userId] });
  };

  const onInterested = async () => {
    setBusy(true);
    try {
      const res = await interested({ data: { jobId } });
      track("job_interested", { job_id: jobId });
      invalidate();
      toast.success(t.jobs.interestedDone);
      if (res.applicationId) void navigate({ to: "/applications/$applicationId", params: { applicationId: res.applicationId } });
    } catch {
      toast.error(t.auth.genericError);
    } finally {
      setBusy(false);
    }
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

  const h = size === "sm" ? "h-9" : "h-12";

  return (
    <>
      <div className="flex gap-2">
        <Button className={`${h} flex-1 rounded-2xl`} disabled={busy} onClick={onInterested}>
          <Check className="size-4" /> {t.jobs.interested}
        </Button>
        <Button variant="outline" className={`${h} rounded-2xl`} onClick={onSave} aria-label={t.jobs.save}>
          <Bookmark className="size-4" />
        </Button>
        <Button variant="ghost" className={`${h} rounded-2xl`} onClick={() => setOpen(true)} aria-label={t.jobs.skip}>
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
