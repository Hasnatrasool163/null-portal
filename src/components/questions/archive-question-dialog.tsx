"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { QuestionListItem } from "@/shared/schemas/question";

/** Confirmation before moving a question to the Archived tab. */
export function ArchiveQuestionDialog({
  question,
  pending,
  onConfirm,
  onClose,
}: {
  question: QuestionListItem | null;
  pending: boolean;
  onConfirm: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={question !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Archive question?"
        description="It moves to Archived, where you can restore it any time. Exams that already use it keep their copy."
      >
        <p className="line-clamp-3 text-sm">{question?.body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => question && onConfirm(question.id)}
          >
            Archive
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
