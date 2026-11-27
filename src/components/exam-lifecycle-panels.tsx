"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { ExamDetail } from "@/shared/schemas/exam";
import type { QuestionDetail } from "@/shared/schemas/question";
import { editLevel } from "@/shared/exam-lifecycle";

const textareaCls =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Admin controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Admins oversee exams but cannot edit questions, marks, grades or results.
          {exam.status === "CLOSED" && exam.closeReason && (
            <>
              {" "}
              {exam.cancelled ? "Cancelled" : "Closed"}: <b>{exam.closeReason}</b>
            </>
          )}
        </p>
        {open && (
          <div className="space-y-2">
            <textarea
              rows={2}
              className={textareaCls}
              placeholder="Reason (required, audited)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {exam.status === "PUBLISHED" && (
                <Button
                  variant="outline"
                  disabled={reason.trim().length < 5 || close.isPending}
                  onClick={() => close.mutate("CLOSE")}
                >
                  Close exam
                </Button>
              )}
              <Button
                variant="destructive"
                disabled={reason.trim().length < 5 || close.isPending}
                onClick={() => close.mutate("CANCEL")}
              >
                {close.isPending && <Spinner />}
                Cancel exam
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Owner: {exam.ownerName}</span>
          <select
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            aria-label="New owner"
          >
            <option value="">Reassign to…</option>
            {(examiners.data?.users ?? [])
              .filter((u) => u.isActive)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
          <Button
            variant="outline"
            disabled={!ownerId || reassign.isPending}
            onClick={() => reassign.mutate()}
          >
            Reassign
          </Button>
        </div>
      </CardContent>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Answer-key rescore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!readOnly && !exam.cancelled && (
          <div className="space-y-2">
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
              value={qid}
              onChange={(e) => {
                setQid(e.target.value);
                setPicked([]);
              }}
              aria-label="Question to rescore"
            >
              <option value="">Choose a question…</option>
              {objective.map((x) => (
                <option key={x.questionId} value={x.questionId}>
                  Q{x.position + 1}: {x.body.slice(0, 80)}
                </option>
              ))}
            </select>
            {q && (
              <div className="space-y-1">
                {q.options.map((o) => (
                  <label key={o.id} className="flex items-center gap-2">
                    <input
                      type={q.type === "MCQ_SINGLE" ? "radio" : "checkbox"}
                      name="rescore-key"
                      checked={picked.includes(o.id)}
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
                    {o.body}
                    {o.isCorrect && (
                      <span className="text-muted-foreground text-xs">(current key)</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            <Input
              placeholder="Reason (required, audited)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              disabled={!qid || picked.length === 0 || reason.trim().length < 3 || rescore.isPending}
              onClick={() => rescore.mutate()}
            >
              {rescore.isPending && <Spinner />}
              Rescore
            </Button>
          </div>
        )}
        {history.data && history.data.length > 0 && (
          <ul className="space-y-1">
            {history.data.map((r) => (
              <li key={r.id} className="text-muted-foreground">
                {format(new Date(r.createdAt), "PP p")} · key [{r.oldCorrectIds.join(", ")}] → [
                {r.newCorrectIds.join(", ")}] · {r.changes.length} answer(s) changed ·{" "}
                {r.reason} {r.rescoredBy && `(${r.rescoredBy})`}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
