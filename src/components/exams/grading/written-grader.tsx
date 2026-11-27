"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Spinner } from "@/components/ui/misc";
import { useSaveMark } from "@/components/exams/grading/use-save-mark";
import type { GradingAnswerItem } from "@/shared/schemas/grading";

/** Mark entry for one written answer inside the per-candidate attempt dialog. */
export function WrittenGrader({
  attemptId,
  item,
  readOnly,
  onSaved,
}: {
  attemptId: string;
  item: GradingAnswerItem;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const [score, setScore] = useState(
    item.score !== null ? String(item.score) : "",
  );
  const [feedback, setFeedback] = useState(item.feedback ?? "");

  const save = useSaveMark({
    attemptId,
    attemptQuestionId: item.attemptQuestionId,
    onSuccess: () => {
      toast.success("Mark saved");
      onSaved();
    },
  });

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            Q{item.position + 1}. {item.body}
          </p>
          <p className="text-muted-foreground text-xs">
            Written · Max {item.marks} marks
            {item.syncedLate && " · Synced late"}
          </p>
        </div>
        <Badge
          className={
            item.score !== null
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning"
          }
        >
          {item.score !== null ? `${item.score} / ${item.marks}` : "Ungraded"}
        </Badge>
      </div>

      <div className="bg-muted/60 rounded-md p-3 text-sm whitespace-pre-wrap">
        {item.textAnswer && item.textAnswer.trim().length > 0 ? (
          item.textAnswer
        ) : (
          <span className="text-muted-foreground italic">
            No response submitted.
          </span>
        )}
      </div>

      {!readOnly && (
        <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
          <div>
            <label
              htmlFor={`score-${item.attemptQuestionId}`}
              className="text-xs font-medium"
            >
              Marks (0–{item.marks})
            </label>
            <Input
              id={`score-${item.attemptQuestionId}`}
              type="number"
              min={0}
              max={item.marks}
              step={0.5}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor={`fb-${item.attemptQuestionId}`}
              className="text-xs font-medium"
            >
              Feedback (optional)
            </label>
            <Input
              id={`fb-${item.attemptQuestionId}`}
              placeholder="Brief comment for candidate..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={score === "" || save.isPending}
            onClick={() => save.mutate({ score: Number(score), feedback })}
          >
            {save.isPending && <Spinner />}
            Save mark
          </Button>
        </div>
      )}
    </div>
  );
}
