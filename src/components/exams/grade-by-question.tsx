"use client";
import { ChevronLeft, ChevronRight, Keyboard, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/blocks";
import { QuestionProgressHeader } from "@/components/exams/grading/question-progress-header";
import { ResponseGrader } from "@/components/exams/grading/response-grader";
import { useBlindGrading } from "@/components/exams/grading/use-blind-grading";
import { useGradingShortcuts } from "@/components/exams/grading/use-grading-shortcuts";
import type { ExamGradingResponse } from "@/shared/schemas/grading";

/** Blind grading: one written question at a time, candidate names hidden. */
export function GradeByQuestion({
  data,
  readOnly,
  onSaved,
}: {
  data: ExamGradingResponse;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const g = useBlindGrading(data);
  const { question, responses, current, idx, setIdx, go, nextUngraded } = g;

  useGradingShortcuts({ idx, readOnly, go, nextUngraded, setIdx });

  if (!question || !current) {
    return (
      <EmptyState
        title="No written answers to grade"
        text="Grade-by-question lists written questions once candidates have submitted."
      />
    );
  }

  return (
    <div className="space-y-4">
      <QuestionProgressHeader
        questions={g.questions}
        question={question}
        isGraded={g.isGraded}
        gradedCount={g.gradedCount}
        allGraded={g.allGraded}
        allWrittenCount={g.allWrittenCount}
        onSelect={g.selectQuestion}
      />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={idx === 0}
          onClick={() => go(idx - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm font-medium" aria-live="polite">
          Response {idx + 1} of {responses.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const j = nextUngraded(idx);
              if (j >= 0) setIdx(j);
              else toast.success("Every response to this question is graded");
            }}
          >
            <SkipForward className="h-4 w-4" />
            Next ungraded
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={idx >= responses.length - 1}
            onClick={() => go(idx + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ResponseGrader
        key={current.item.attemptQuestionId}
        response={current}
        graded={g.isGraded(current)}
        readOnly={readOnly}
        onSaved={() => {
          const aq = current.item.attemptQuestionId;
          g.markSaved(aq);
          onSaved();
          const j = nextUngraded(idx, aq);
          if (j >= 0) setIdx(j);
          else toast.success("All responses to this question are graded");
        }}
      />

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          <kbd>←</kbd>/<kbd>→</kbd> or <kbd>k</kbd>/<kbd>j</kbd> previous/next
        </span>
        <span>
          <kbd>n</kbd> next ungraded
        </span>
        {!readOnly && (
          <>
            <span>
              <kbd>g</kbd> focus marks
            </span>
            <span>
              <kbd>Enter</kbd> save &amp; next
            </span>
          </>
        )}
      </p>
    </div>
  );
}
