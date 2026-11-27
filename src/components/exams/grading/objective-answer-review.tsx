"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type { GradingAnswerItem } from "@/shared/schemas/grading";

/** Read-only view of an auto-graded answer, with the late-sync discard action. */
export function ObjectiveAnswerReview({
  answer: ans,
  readOnly,
  discardPending,
  onDiscardLate,
}: {
  answer: GradingAnswerItem;
  readOnly: boolean;
  discardPending: boolean;
  onDiscardLate: (answerId: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">
          Q{ans.position + 1}. {ans.body}
        </p>
        <div className="flex items-center gap-1.5">
          {ans.syncedLate && (
            <Badge className="bg-warning/15 text-warning">Late sync</Badge>
          )}
          <Badge>
            {ans.score ?? 0} / {ans.marks}
          </Badge>
        </div>
      </div>
      {ans.syncedLate && !readOnly && ans.answerId && (
        <div className="flex items-center justify-between gap-2 rounded bg-warning/10 px-2.5 py-1.5 text-xs">
          <span>
            Captured offline before deadline, arrived during recovery window.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={discardPending}
            onClick={() => onDiscardLate(ans.answerId!)}
          >
            Discard late answer
          </Button>
        </div>
      )}
      <p className="text-muted-foreground text-xs">{TYPE_LABEL[ans.type]}</p>
      <ul className="space-y-1 text-xs">
        {ans.options.map((o) => {
          const picked = ans.selectedOptionIds.includes(o.id);
          return (
            <li
              key={o.id}
              className={`rounded px-2 py-1 ${
                o.isCorrect
                  ? "bg-success/10 text-success"
                  : picked
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {picked ? "● " : "○ "}
              {o.body}
              {o.isCorrect && " (correct)"}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
