import { Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatScore, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CandidateResultQuestion } from "@/shared/schemas/grading";
import { TYPE_LABEL } from "@/shared/schemas/question";
import { OUTCOME, type Outcome } from "./outcome";
import { OptionResults } from "./option-results";

/** One graded question: score, the candidate's answer, feedback and a dispute link. */
export function QuestionResultCard({
  question: q,
  outcome,
  onDispute,
}: {
  question: CandidateResultQuestion;
  outcome: Outcome;
  /** Omit when this question can't be disputed. */
  onDispute?: () => void;
}) {
  const o = OUTCOME[outcome];
  return (
    <Card className="relative overflow-hidden">
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", o.bar)}
        aria-hidden="true"
      />
      <div className="space-y-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-xs">
              Question {q.position + 1} · {TYPE_LABEL[q.type]} ·{" "}
              {plural(q.marks, "mark")}
            </p>
            <p className="leading-relaxed font-medium">{q.body}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg leading-none font-semibold tabular-nums">
              {q.score === null ? "–" : formatScore(q.score)}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {formatScore(q.marks)}
              </span>
            </p>
            <p className={cn("mt-1 text-xs font-medium", o.text)}>{o.label}</p>
          </div>
        </div>

        {q.type === "WRITTEN" ? (
          <div className="border-l-2 pl-4">
            <p className="text-muted-foreground mb-1 text-xs">Your answer</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {q.textAnswer?.trim() || (
                <span className="text-muted-foreground italic">
                  No answer provided.
                </span>
              )}
            </p>
          </div>
        ) : (
          <OptionResults question={q} />
        )}

        {q.feedback && (
          <div className="bg-muted/60 rounded-md px-3.5 py-3 text-sm">
            <p className="text-muted-foreground mb-0.5 text-xs font-medium">
              Examiner feedback
            </p>
            <p className="leading-relaxed">{q.feedback}</p>
          </div>
        )}

        {onDispute && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onDispute}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium"
            >
              <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              Dispute this question
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
