"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { ExamDetail } from "@/shared/schemas/exam";
import type { QuestionDetail } from "@/shared/schemas/question";
import { editLevel } from "@/shared/exam-lifecycle";

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b px-5 py-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
    </div>
  );
}

function Step({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
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

/** Admin-only oversight actions: close/cancel with a mandatory reason, and owner reassignment. */
export function AdminExamActions({ exam }: { exam: ExamDetail }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const done = (updated: ExamDetail, msg: string) => {
    toast.success(msg);
    setReason("");
    qc.setQueryData(["exam", exam.id], updated);
    qc.invalidateQueries({ queryKey: ["exams"] });
    qc.invalidateQueries({ queryKey: ["exam-audit"] });
  };

  const examiners = useQuery({
    queryKey: ["admin-examiners"],
    queryFn: () =>
      api<{ users: { id: string; name: string; isActive: boolean }[] }>(
        "/api/admin/users?role=EXAMINER&pageSize=100",
      ),
  });

  const close = useMutation({
    mutationFn: (action: "CLOSE" | "CANCEL") =>
      api<ExamDetail>(`/api/admin/exams/${exam.id}/close`, {
        method: "POST",
        body: { action, reason },
      }),
    onSuccess: (u) => done(u, "Exam updated"),
    onError: (e) => toast.error(e.message),
  });
  const reassign = useMutation({
    mutationFn: () =>
      api<ExamDetail>(`/api/admin/exams/${exam.id}/owner`, {
        method: "POST",
        body: { ownerId },
      }),
    onSuccess: (u) => done(u, "Exam reassigned"),
    onError: (e) => toast.error(e.message),
  });

  const open = exam.status !== "CLOSED";
  const reasonOk = reason.trim().length >= 5;
  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="Admin controls"
        description="Admins oversee exams but cannot edit questions, marks, grades or results."
      />
      <div className="space-y-6 p-5">
        {exam.status === "CLOSED" && exam.closeReason && (
          <div className="bg-muted/60 rounded-md px-3.5 py-3 text-sm">
            <p className="text-muted-foreground text-xs font-medium">
              {exam.cancelled ? "Cancelled" : "Closed"} by an administrator
            </p>
            <p>{exam.closeReason}</p>
          </div>
        )}

        {open && (
          <div className="space-y-2">
            <label htmlFor="admin-reason" className="text-sm font-medium">
              Close or cancel
            </label>
            <Textarea
              id="admin-reason"
              rows={2}
              placeholder="Reason for the record (at least 5 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">
                Logged in the audit trail with your name.
              </p>
              <div className="flex gap-2">
                {exam.status === "PUBLISHED" && (
                  <Button
                    variant="outline"
                    disabled={!reasonOk || close.isPending}
                    onClick={() => close.mutate("CLOSE")}
                  >
                    Close exam
                  </Button>
                )}
                <Button
                  variant="destructive"
                  disabled={!reasonOk || close.isPending}
                  onClick={() => close.mutate("CANCEL")}
                >
                  {close.isPending && <Spinner />}
                  Cancel exam
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 border-t pt-5">
          <p className="text-sm font-medium">
            Owner <span className="text-muted-foreground font-normal">· {exam.ownerName}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-56 flex-1">
              <Select
                aria-label="New owner"
                value={ownerId}
                placeholder="Reassign to…"
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Reassign to…</option>
                {(examiners.data?.users ?? [])
                  .filter((u) => u.isActive)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </Select>
            </div>
            <Button
              variant="outline"
              disabled={!ownerId || reassign.isPending}
              onClick={() => reassign.mutate()}
            >
              {reassign.isPending && <Spinner />}
              Reassign
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

type RescoreRun = {
  id: string;
  questionId: string;
  oldCorrectIds: number[];
  newCorrectIds: number[];
  reason: string;
  attemptsAffected: number;
  rescoredBy: string | null;
  createdAt: string;
  changes: { oldScore: number | null; newScore: number | null }[];
};

/** Completed exams: audited answer-key rescore (old and new values are kept). */
export function RescorePanel({
  exam,
  readOnly,
}: {
  exam: ExamDetail;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [qid, setQid] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [reason, setReason] = useState("");

  const history = useQuery({
    queryKey: ["exam-rescores", exam.id],
    queryFn: () => api<RescoreRun[]>(`/api/exams/${exam.id}/rescore`),
  });
  const question = useQuery({
    queryKey: ["rescore-question", qid],
    queryFn: () => api<QuestionDetail>(`/api/questions/${qid}`),
    enabled: !!qid && !readOnly,
  });

  const rescore = useMutation({
    mutationFn: () =>
      api<{ answersChanged: number; attemptsAffected: number }>(
        `/api/exams/${exam.id}/rescore`,
        {
          method: "POST",
          body: {
            questionId: qid,
            correctOptionIds: picked,
            reason,
            updatedAt: exam.updatedAt,
          },
        },
      ),
    onSuccess: (r) => {
      toast.success(
        `Rescored: ${r.answersChanged} answer(s) across ${r.attemptsAffected} attempt(s)`,
      );
      setQid("");
      setPicked([]);
      setReason("");
      qc.invalidateQueries({ queryKey: ["exam", exam.id] });
      qc.invalidateQueries({ queryKey: ["exam-rescores", exam.id] });
    },
    onError: (e) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["exam", exam.id] });
    },
  });

  if (editLevel(exam) !== "TITLE_ONLY" || exam.status === "DRAFT") return null;
  const objective = exam.questions.filter((q) => q.type !== "WRITTEN");
  const q = question.data;
  const reasonLen = reason.trim().length;
  const qLabel = (id: string) => {
    const x = exam.questions.find((y) => y.questionId === id);
    return x ? `Q${x.position + 1}` : "Question";
  };

  return (
    <Card className="overflow-hidden">
      <PanelHeader
        title="Answer-key rescore"
        description="Correct a wrong answer key after the exam. Every affected attempt is re-marked and the change is audited."
      />
      {!readOnly && !exam.cancelled && (
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
              ) : q ? (
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
                              setPicked((p) =>
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
                            <span className="text-muted-foreground text-xs">Current key</span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
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
              {reasonLen > 0 && reasonLen < 3 ? "At least 3 characters." : "Shown in the audit log."}
            </p>
          </Step>

          <div className="flex justify-end border-t pt-4">
            <Button
              disabled={!qid || picked.length === 0 || reasonLen < 3 || rescore.isPending}
              onClick={() => rescore.mutate()}
            >
              {rescore.isPending && <Spinner />}
              Rescore attempts
            </Button>
          </div>
        </div>
      )}

      {history.data && history.data.length > 0 && (
        <div className="border-t">
          <p className="text-muted-foreground px-5 pt-4 pb-2 text-xs font-medium">
            History
          </p>
          <ul className="divide-y">
            {history.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {qLabel(r.questionId)} answer key updated
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {r.changes.length} answer{r.changes.length === 1 ? "" : "s"} re-marked
                    </span>
                  </p>
                  <p className="text-muted-foreground">“{r.reason}”</p>
                </div>
                <p className="text-muted-foreground text-xs whitespace-nowrap">
                  {format(new Date(r.createdAt), "MMM d, p")}
                  {r.rescoredBy && ` · ${r.rescoredBy}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
