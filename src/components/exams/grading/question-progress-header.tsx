"use client";
import { EyeOff } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/misc";
import type {
  WrittenQuestion,
  WrittenResponse,
} from "@/components/exams/grading/build-written-questions";

/** Question picker, grading progress and the question prompt for blind grading. */
export function QuestionProgressHeader({
  questions,
  question,
  isGraded,
  gradedCount,
  allGraded,
  allWrittenCount,
  onSelect,
}: {
  questions: WrittenQuestion[];
  question: WrittenQuestion;
  isGraded: (r: WrittenResponse) => boolean;
  gradedCount: number;
  allGraded: number;
  allWrittenCount: number;
  onSelect: (questionId: string) => void;
}) {
  const total = question.responses.length;
  const pct = total ? (gradedCount / total) * 100 : 0;

  return (
    <div className="bg-card space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="bq-question" className="text-xs font-medium">
            Written question
          </label>
          <Select
            id="bq-question"
            value={question.questionId}
            onChange={(e) => onSelect(e.target.value)}
          >
            {questions.map((q, i) => {
              const g = q.responses.filter(isGraded).length;
              return (
                <option key={q.questionId} value={q.questionId}>
                  {`W${i + 1}. ${q.body.slice(0, 70)}${q.body.length > 70 ? "…" : ""} (${g}/${q.responses.length} graded)`}
                </option>
              );
            })}
          </Select>
        </div>
        <Badge className="bg-muted text-muted-foreground gap-1">
          <EyeOff className="h-3 w-3" aria-hidden="true" />
          Names hidden
        </Badge>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span className="font-medium">
            {gradedCount} of {total} graded for this question
          </span>
          <span className="text-muted-foreground">
            All written answers: {allGraded}/{allWrittenCount}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Grading progress for this question"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={gradedCount}
          className="bg-muted h-2 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-sm whitespace-pre-wrap">
        <span className="text-muted-foreground">
          Question · max {question.marks} marks:{" "}
        </span>
        {question.body}
      </p>
    </div>
  );
}
