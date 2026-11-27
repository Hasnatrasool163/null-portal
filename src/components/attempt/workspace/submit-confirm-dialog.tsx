"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/misc";
import type { AnswerCounts } from "./draft-answer";

/** Final "are you sure" before a manual submit. */
export function SubmitConfirmDialog({
  open,
  onOpenChange,
  counts,
  total,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: AnswerCounts;
  total: number;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Submit your exam?"
        description="You will not be able to change your answers after submitting."
      >
        <p className="text-sm">
          Answered <b>{counts.answered}</b> of <b>{total}</b> questions
          {counts.flagged > 0 && ` (${counts.flagged} flagged)`}.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={submitting}
            aria-busy={submitting}
            onClick={onConfirm}
          >
            {submitting && <Spinner />}
            {submitting ? "Submitting..." : "Confirm submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
