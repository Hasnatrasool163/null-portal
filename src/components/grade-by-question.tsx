"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Keyboard,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, Spinner } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { api } from "@/lib/api-client";
import type {
  ExamGradingResponse,
  GradingAnswerItem,
} from "@/shared/schemas/grading";

type Response = { attemptId: string; item: GradingAnswerItem };
type WrittenQuestion = {
  questionId: string;
  body: string;
  marks: number;
  responses: Response[];
};

/** Stable, identity-free order: sorts by a hash of the attempt id, not by name or submit time. */
function blindKey(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildQuestions(data: ExamGradingResponse): WrittenQuestion[] {
  const map = new Map<string, WrittenQuestion & { posSum: number }>();
  for (const a of data.attempts) {
    if (a.status !== "SUBMITTED") continue;
    for (const item of a.answers) {
      if (item.type !== "WRITTEN") continue;
      let q = map.get(item.questionId);
      if (!q) {
        q = {
          questionId: item.questionId,
          body: item.body,
          marks: item.marks,
          responses: [],
          posSum: 0,
        };
        map.set(item.questionId, q);
      }
      q.responses.push({ attemptId: a.attemptId, item });
      q.posSum += item.position;
    }
  }
  return [...map.values()]
    .sort(
      (x, y) => x.posSum / x.responses.length - y.posSum / y.responses.length,
    )
    .map((q) => ({
      questionId: q.questionId,
      body: q.body,
      marks: q.marks,
      responses: q.responses.sort(
        (r1, r2) => blindKey(r1.attemptId) - blindKey(r2.attemptId),
      ),
    }));
}

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

export function GradeByQuestion({
  data,
  readOnly,
  onSaved,
}: {
  data: ExamGradingResponse;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const questions = useMemo(() => buildQuestions(data), [data]);
  const [qId, setQId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  // Marks saved in this session, so "next ungraded" is right before the refetch lands.
  const [savedLocal, setSavedLocal] = useState<Set<string>>(new Set());

  const question = questions.find((q) => q.questionId === qId) ?? questions[0];
  const responses = useMemo(() => question?.responses ?? [], [question]);
  const current = responses[Math.min(idx, Math.max(0, responses.length - 1))];

  const isGraded = useCallback(
    (r: Response) =>
      r.item.score !== null || savedLocal.has(r.item.attemptQuestionId),
    [savedLocal],
  );
  const gradedCount = responses.filter(isGraded).length;
  const allWritten = questions.flatMap((q) => q.responses);
  const allGraded = allWritten.filter(isGraded).length;

  const go = useCallback(
    (to: number) => setIdx(Math.max(0, Math.min(responses.length - 1, to))),
    [responses.length],
  );
  const nextUngraded = useCallback(
    (from: number, extraGraded?: string) => {
      for (let k = 1; k <= responses.length; k++) {
        const j = (from + k) % responses.length;
        const r = responses[j];
        if (!isGraded(r) && r.item.attemptQuestionId !== extraGraded) return j;
      }
      return -1;
    },
    [responses, isGraded],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        go(idx + 1);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        go(idx - 1);
      } else if (e.key === "n") {
        e.preventDefault();
        const j = nextUngraded(idx);
        if (j >= 0) setIdx(j);
      } else if (e.key === "g" && !readOnly) {
        e.preventDefault();
        document.getElementById("bq-score")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, idx, nextUngraded, readOnly]);

  if (!question || !current) {
    return (
      <EmptyState
        title="No written answers to grade"
        text="Grade-by-question lists written questions once candidates have submitted."
      />
    );
  }

  const pct = responses.length ? (gradedCount / responses.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="bg-card space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="bq-question" className="text-xs font-medium">
              Written question
            </label>
            <Select
              id="bq-question"
              value={question.questionId}
              onChange={(e) => {
                setQId(e.target.value);
                setIdx(0);
              }}
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
              {gradedCount} of {responses.length} graded for this question
            </span>
            <span className="text-muted-foreground">
              All written answers: {allGraded}/{allWritten.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Grading progress for this question"
            aria-valuemin={0}
            aria-valuemax={responses.length}
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
        graded={isGraded(current)}
        readOnly={readOnly}
        onSaved={() => {
          const aq = current.item.attemptQuestionId;
          setSavedLocal((s) => new Set(s).add(aq));
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

function ResponseGrader({
  response,
  graded,
  readOnly,
  onSaved,
}: {
  response: Response;
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

  const save = useMutation({
    mutationFn: () =>
      api(`/api/attempts/${attemptId}/grade/${item.attemptQuestionId}`, {
        method: "PUT",
        body: { score: Number(score), feedback: feedback.trim() || undefined },
      }),
    onSuccess: onSaved,
    onError: (e) => toast.error(e.message),
  });

  const n = Number(score);
  const valid =
    score !== "" &&
    Number.isFinite(n) &&
    n >= 0 &&
    n <= item.marks &&
    Number.isInteger(n * 2);

  return (
    <form
      className="bg-card space-y-3 rounded-lg border p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape")
          (document.activeElement as HTMLElement | null)?.blur();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !save.isPending) save.mutate();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide uppercase">
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
