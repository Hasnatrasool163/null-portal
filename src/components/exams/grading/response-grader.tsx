"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Spinner } from "@/components/ui/misc";
import { useSaveMark } from "@/components/exams/grading/use-save-mark";
import type { WrittenResponse } from "@/components/exams/grading/build-written-questions";

/** Valid marks are 0..max in 0.5 steps. */
function isValidMark(score: string, max: number) {
  const n = Number(score);
  return (
    score !== "" &&
    Number.isFinite(n) &&
    n >= 0 &&
    n <= max &&
    Number.isInteger(n * 2)
  );
}

/** Blind marking form for a single response; Enter saves and advances. */
export function ResponseGrader({
  response,
  graded,
  readOnly,
  onSaved,
}: {
  response: WrittenResponse;
  graded: boolean;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const { item, attemptId } = response;
  const [score, setScore] = useState(
    item.score !== null ? String(item.score) : "",
  );
  const [feedback, setFeedback] = useState(item.feedback ?? "");
  const scoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!readOnly) scoreRef.current?.focus();
  }, [readOnly]);

  const save = useSaveMark({
    attemptId,
    attemptQuestionId: item.attemptQuestionId,
    onSuccess: onSaved,
  });

  const valid = isValidMark(score, item.marks);

  return (
    <form
      className="bg-card space-y-3 rounded-lg border p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape")
          (document.activeElement as HTMLElement | null)?.blur();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !save.isPending)
          save.mutate({ score: Number(score), feedback });
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">
          Candidate response
        </p>
        <div className="flex gap-1.5">
          {item.syncedLate && (
            <Badge className="bg-warning/15 text-warning">Synced late</Badge>
          )}
          <Badge
            className={
              graded
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }
          >
            {item.score !== null
              ? `${item.score} / ${item.marks}`
              : graded
                ? "Saved"
                : "Ungraded"}
          </Badge>
        </div>
      </div>
      <div className="bg-muted/60 max-h-80 overflow-y-auto rounded-md p-3 text-sm whitespace-pre-wrap">
        {item.textAnswer && item.textAnswer.trim().length > 0 ? (
          item.textAnswer
        ) : (
          <span className="text-muted-foreground italic">
            No response submitted.
          </span>
        )}
      </div>

      {!readOnly && (
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="bq-score" className="text-xs font-medium">
              Marks (0–{item.marks}, 0.5 steps)
            </label>
            <Input
              id="bq-score"
              ref={scoreRef}
              type="number"
              inputMode="decimal"
              min={0}
              max={item.marks}
              step={0.5}
              value={score}
              aria-invalid={score !== "" && !valid}
              onChange={(e) => setScore(e.target.value)}
            />
            <div className="mt-1 flex gap-1">
              {[0, item.marks / 2, item.marks].map((v) => {
                const snapped = Math.round(v * 2) / 2;
                return (
                  <button
                    key={v}
                    type="button"
                    className="hover:bg-accent rounded border px-1.5 py-0.5 text-xs"
                    onClick={() => setScore(String(snapped))}
                  >
                    {snapped}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="bq-feedback" className="text-xs font-medium">
              Feedback (optional)
            </label>
            <Input
              id="bq-feedback"
              placeholder="Brief comment for the candidate…"
              value={feedback}
              maxLength={2000}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!valid || save.isPending}>
            {save.isPending && <Spinner />}
            Save &amp; next
          </Button>
        </div>
      )}
    </form>
  );
}
