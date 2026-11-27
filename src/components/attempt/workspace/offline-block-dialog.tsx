"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/** Shown when a manual submit was refused because answers are still only on this device. */
export function OfflineBlockDialog({
  pendingCount,
  onDismiss,
  onRetry,
}: {
  /** Answers not yet on the server; 0 hides the dialog. */
  pendingCount: number;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={pendingCount > 0} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent
        title="Your answers aren't on the server yet"
        description="We didn't submit, so nothing is lost."
      >
        <div className="space-y-4 text-sm">
          <p>
            <b>{pendingCount}</b> answer{pendingCount === 1 ? " is" : "s are"}{" "}
            saved on this device but haven&apos;t reached the server. Reconnect,
            wait for the badge to show
            <b> Saved</b>, then submit again. Your timer keeps running on the
            server.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onDismiss}>
              Keep working
            </Button>
            <Button onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
