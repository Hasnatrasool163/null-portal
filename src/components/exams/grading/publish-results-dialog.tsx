"use client";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePublishResults } from "@/components/exams/grading/use-publish-results";
import type { ExamGradingResponse } from "@/shared/schemas/grading";

/** Non-blocking caveats the examiner should see before publishing. */
function publishWarnings(data: ExamGradingResponse) {
  return [
    data.notAttemptedCount > 0 &&
      `${data.notAttemptedCount} enrolled candidate(s) have not attempted this exam.`,
    data.examWindowOpen &&
      "The exam window is still open: candidates who start later will see their results as soon as they submit.",
  ].filter((w): w is string => Boolean(w));
}

export function PublishResultsDialog({
  examId,
  data,
  open,
  onOpenChange,
}: {
  examId: string;
  data: ExamGradingResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const publish = usePublishResults(examId, () => onOpenChange(false));
  const warnings = publishWarnings(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Publish exam results?"
        description="Enrolled candidates with submitted attempts will be able to see their score and feedback (plus the answer key if enabled). This cannot be undone."
      >
        {warnings.length > 0 && (
          <ul
            role="alert"
            className="border-warning/40 bg-warning/10 mb-4 space-y-1.5 rounded-md border p-3 text-sm"
          >
            {warnings.map((w) => (
              <li key={w} className="flex items-start gap-2">
                <AlertTriangle
                  className="text-warning mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                {w}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending && <Spinner />}
            Publish results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
