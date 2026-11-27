"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { MonitorAttempt } from "@/shared/schemas/monitoring";

/**
 * Grant an audited time extension. The form state lives here (outside the
 * dialog content) so a cancelled draft is still there on the next open.
 */
export function ExtensionDialog({
  examId,
  attempt,
  onClose,
}: {
  examId: string;
  attempt: MonitorAttempt | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [extMinutes, setExtMinutes] = useState("5");
  const [extReason, setExtReason] = useState("");

  const grantExt = useMutation({
    mutationFn: () =>
      attemptsApi.grantExtension(attempt!.attemptId, {
        minutes: Number(extMinutes),
        reason: extReason.trim(),
      }),
    onSuccess: () => {
      toast.success("Time extension granted and logged");
      onClose();
      setExtMinutes("5");
      setExtReason("");
      qc.invalidateQueries({ queryKey: qk.exams.monitor(examId) });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={attempt !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={
          attempt
            ? `Grant time extension — ${attempt.candidateName}`
            : "Grant time extension"
        }
        description="Audited fairness valve for verified power or hardware disruptions. Recorded in exam reports."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ext-min" className="text-sm font-medium">
              Extra minutes (1–120)
            </label>
            <Input
              id="ext-min"
              type="number"
              min={1}
              max={120}
              value={extMinutes}
              onChange={(e) => setExtMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ext-reason" className="text-sm font-medium">
              Required audit reason
            </label>
            <Input
              id="ext-reason"
              placeholder="e.g. Verified lab workstation reboot during exam"
              value={extReason}
              onChange={(e) => setExtReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={
                extReason.trim().length < 3 ||
                Number(extMinutes) < 1 ||
                grantExt.isPending
              }
              onClick={() => grantExt.mutate()}
            >
              {grantExt.isPending && <Spinner />}
              Grant +{extMinutes} min
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
