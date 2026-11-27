"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ObjectiveAnswerReview } from "@/components/exams/grading/objective-answer-review";
import { WrittenGrader } from "@/components/exams/grading/written-grader";
import { useDiscardLateAnswer } from "@/components/exams/grading/use-discard-late-answer";
import type { GradingAttemptSummary } from "@/shared/schemas/grading";

/** One candidate's attempt: grade written answers, inspect objective ones. */
export function AttemptGradingDialog({
  examId,
  attempt,
  readOnly,
  onClose,
  onSaved,
}: {
  examId: string;
  attempt: GradingAttemptSummary | undefined;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  // One mutation for the whole dialog so every discard button disables together.
  const discardLate = useDiscardLateAnswer(examId);

  return (
    <Dialog open={attempt !== undefined} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl overflow-y-auto"
        title={
          attempt
            ? `${attempt.candidateName} — ${attempt.totalScore ?? 0} / ${attempt.totalMarks}`
            : "Attempt"
        }
        description="Objective questions are auto-graded from the attempt snapshot. Written questions are graded manually in 0.5 steps."
      >
        {attempt && (
          <div className="space-y-4">
            {attempt.answers.map((ans) =>
              ans.type === "WRITTEN" ? (
                <WrittenGrader
                  key={ans.attemptQuestionId}
                  attemptId={attempt.attemptId}
                  item={ans}
                  readOnly={readOnly}
                  onSaved={onSaved}
                />
              ) : (
                <ObjectiveAnswerReview
                  key={ans.attemptQuestionId}
                  answer={ans}
                  readOnly={readOnly}
                  discardPending={discardLate.isPending}
                  onDiscardLate={(answerId) =>
                    discardLate.mutate({
                      attemptId: attempt.attemptId,
                      answerId,
                    })
                  }
                />
              ),
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
