"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/misc";
import { questionsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ExamDetail } from "@/shared/schemas/exam";
import type { QuestionDetail } from "@/shared/schemas/question";
import { useRescore } from "./use-rescore";

function Step({
  n,
  label,
  children,
}: {
  n: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:gap-6">
      <p className="flex items-center gap-2 text-sm font-medium sm:pt-2">
        <span className="bg-muted text-muted-foreground flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold tabular-nums">
          {n}
        </span>
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Radio/checkbox list of a question's options for choosing the corrected key. */
function KeyOptions({
  question: q,
  picked,
  onChange,
}: {
  question: QuestionDetail;
  picked: number[];
  onChange: (update: (prev: number[]) => number[]) => void;
}) {
  return (
    <ul className="divide-y rounded-md border">
      {q.options.map((o) => {
        const on = picked.includes(o.id);
        return (
          <li key={o.id}>
            <label
              className={`flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                on ? "bg-accent/50" : "hover:bg-muted/40"
              }`}
            >
              <input
                type={q.type === "MCQ_SINGLE" ? "radio" : "checkbox"}
                name="rescore-key"
                className="choice"
                checked={on}
                onChange={(e) =>
                  onChange((p) =>
                    q.type === "MCQ_SINGLE"
                      ? [o.id]
                      : e.target.checked
                        ? [...p, o.id]
                        : p.filter((x) => x !== o.id),
                  )
                }
              />
              <span className="flex-1">{o.body}</span>
              {o.isCorrect && (
                <span className="text-muted-foreground text-xs">
                  Current key
                </span>
              )}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** Three-step form: pick an objective question, its corrected key, and a reason. */
export function RescoreForm({ exam }: { exam: ExamDetail }) {
  const [qid, setQid] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [reason, setReason] = useState("");

  const question = useQuery({
    queryKey: qk.questions.rescoreSource(qid),
    queryFn: () => questionsApi.get(qid),
    enabled: !!qid,
  });

  const rescore = useRescore(exam, () => {
    setQid("");
    setPicked([]);
    setReason("");
  });

  const objective = exam.questions.filter((q) => q.type !== "WRITTEN");
  const reasonLen = reason.trim().length;

  return (
    <div className="space-y-5 p-5">
      <Step n={1} label="Question">
        <Select
          aria-label="Question to rescore"
          value={qid}
          placeholder="Choose a question…"
          onChange={(e) => {
            setQid(e.target.value);
            setPicked([]);
          }}
        >
          <option value="">Choose a question…</option>
          {objective.map((x) => (
            <option key={x.questionId} value={x.questionId}>
              Q{x.position + 1} · {x.body.slice(0, 70)}
              {x.body.length > 70 ? "…" : ""}
            </option>
          ))}
        </Select>
      </Step>

      {qid && (
        <Step n={2} label="Correct answer">
          {question.isPending ? (
            <p className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
              <Spinner /> Loading options…
            </p>
          ) : question.data ? (
            <KeyOptions
              question={question.data}
              picked={picked}
              onChange={setPicked}
            />
          ) : null}
        </Step>
      )}

      <Step n={3} label="Reason">
        <Input
          placeholder="Why the key is changing (audited)"
          value={reason}
          aria-invalid={reasonLen > 0 && reasonLen < 3}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          {reasonLen > 0 && reasonLen < 3
            ? "At least 3 characters."
            : "Shown in the audit log."}
        </p>
      </Step>

      <div className="flex justify-end border-t pt-4">
        <Button
          disabled={
            !qid || picked.length === 0 || reasonLen < 3 || rescore.isPending
          }
          onClick={() =>
            rescore.mutate({
              questionId: qid,
              correctOptionIds: picked,
              reason,
            })
          }
        >
          {rescore.isPending && <Spinner />}
          Rescore attempts
        </Button>
      </div>
    </div>
  );
}
