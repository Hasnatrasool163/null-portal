"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, ClipboardCheck, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/blocks";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { TYPE_LABEL } from "@/shared/schemas/question";
import type {
  ExamGradingResponse,
  GradingAnswerItem,
  GradingAttemptSummary,
} from "@/shared/schemas/grading";

function WrittenGrader({
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

  const save = useMutation({
    mutationFn: () =>
      api(`/api/attempts/${attemptId}/grade/${item.attemptQuestionId}`, {
        method: "PUT",
        body: {
          score: Number(score),
          feedback: feedback.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Mark saved");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
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
            onClick={() => save.mutate()}
          >
            {save.isPending && <Spinner />}
            Save mark
          </Button>
        </div>
      )}
    </div>
  );
}

export function ExamGradingTab({
  examId,
  readOnly,
}: {
  examId: string;
  readOnly: boolean;
}) {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const grading = useQuery({
    queryKey: ["exam-grading", examId],
    queryFn: () => api<ExamGradingResponse>(`/api/exams/${examId}/grading`),
  });

  const publish = useMutation({
    mutationFn: () =>
      api(`/api/exams/${examId}/results/publish`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Results published to candidates");
      setConfirmPublish(false);
      qc.invalidateQueries({ queryKey: ["exam-grading", examId] });
      qc.invalidateQueries({ queryKey: ["exam", examId] });
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e) => {
      setConfirmPublish(false);
      toast.error(e.message);
    },
  });

  if (grading.isPending) return <Skeleton className="h-48 w-full" />;
  if (grading.isError) {
    return (
      <EmptyState
        title="Could not load grading data"
        text={grading.error.message}
        action={<Button onClick={() => grading.refetch()}>Try again</Button>}
      />
    );
  }

  const data = grading.data;
  const activeAttempt: GradingAttemptSummary | undefined = data.attempts.find(
    (a) => a.attemptId === activeId,
  );

  return (
    <div className="space-y-4">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
        <div className="text-sm">
          {data.resultsPublishedAt ? (
            <p className="text-success flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Results published on{" "}
              {format(new Date(data.resultsPublishedAt), "PP p")}.
            </p>
          ) : data.publishBlockedReason ? (
            <p className="text-muted-foreground">{data.publishBlockedReason}</p>
          ) : (
            <p className="font-medium">
              All submitted attempts are graded and ready to publish.
            </p>
          )}
        </div>

        {!readOnly && !data.resultsPublishedAt && (
          <Button
            disabled={!data.canPublishResults}
            onClick={() => setConfirmPublish(true)}
          >
            <Send className="h-4 w-4" />
            Publish results
          </Button>
        )}
      </div>

      {data.attempts.length === 0 ? (
        <EmptyState
          title="No attempts yet"
          text="Real candidate attempts (excluding sandbox previews) will appear here once candidates start the exam."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Candidate</TH>
              <TH>Status</TH>
              <TH>Grading</TH>
              <TH>Score</TH>
              <TH>Submitted</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <TBody>
            {data.attempts.map((a) => (
              <TR key={a.attemptId}>
                <TD>
                  <p className="font-medium">{a.candidateName}</p>
                  <p className="text-muted-foreground text-xs">
                    {a.candidateEmail}
                  </p>
                </TD>
                <TD>
                  <Badge>
                    {a.status === "SUBMITTED" ? "Submitted" : "In progress"}
                  </Badge>
                </TD>
                <TD>
                  <Badge
                    className={
                      a.gradingStatus === "NEEDS_REVIEW"
                        ? "bg-warning/15 text-warning"
                        : a.gradingStatus === "GRADED" ||
                            a.gradingStatus === "AUTO_GRADED"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {a.gradingStatus === "NEEDS_REVIEW"
                      ? `${a.pendingWrittenCount} written left`
                      : a.gradingStatus === "GRADED"
                        ? "Graded"
                        : a.gradingStatus === "AUTO_GRADED"
                          ? "Auto-graded"
                          : "Not submitted"}
                  </Badge>
                </TD>
                <TD>
                  {a.totalScore !== null ? (
                    <span>
                      <b>{a.totalScore}</b> / {a.totalMarks}
                      {a.rawScoreSum !== null && a.rawScoreSum < 0 && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          (raw {a.rawScoreSum})
                        </span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-muted-foreground text-xs">
                  {a.submittedAt ? format(new Date(a.submittedAt), "PP p") : "—"}
                </TD>
                <TD className="text-right">
                  <Button
                    size="sm"
                    variant={
                      a.gradingStatus === "NEEDS_REVIEW" && !readOnly
                        ? "default"
                        : "outline"
                    }
                    disabled={a.status !== "SUBMITTED"}
                    onClick={() => setActiveId(a.attemptId)}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {a.gradingStatus === "NEEDS_REVIEW" && !readOnly
                      ? "Grade"
                      : "Inspect"}
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog
        open={activeAttempt !== undefined}
        onOpenChange={(o) => !o && setActiveId(null)}
      >
        <DialogContent
          className="max-h-[90vh] max-w-3xl overflow-y-auto"
          title={
            activeAttempt
              ? `${activeAttempt.candidateName} — ${activeAttempt.totalScore ?? 0} / ${activeAttempt.totalMarks}`
              : "Attempt"
          }
          description="Objective questions are auto-graded from the attempt snapshot. Written questions are graded manually in 0.5 steps."
        >
          {activeAttempt && (
            <div className="space-y-4">
              {activeAttempt.answers.map((ans) =>
                ans.type === "WRITTEN" ? (
                  <WrittenGrader
                    key={ans.attemptQuestionId}
                    attemptId={activeAttempt.attemptId}
                    item={ans}
                    readOnly={readOnly}
                    onSaved={() =>
                      qc.invalidateQueries({
                        queryKey: ["exam-grading", examId],
                      })
                    }
                  />
                ) : (
                  <div
                    key={ans.attemptQuestionId}
                    className="space-y-2 rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        Q{ans.position + 1}. {ans.body}
                      </p>
                      <Badge>
                        {ans.score ?? 0} / {ans.marks}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {TYPE_LABEL[ans.type]}
                    </p>
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
                ),
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setActiveId(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent
          title="Publish exam results?"
          description="Enrolled candidates with submitted attempts will be able to see their score and feedback (plus the answer key if enabled)."
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmPublish(false)}>
              Cancel
            </Button>
            <Button
              disabled={publish.isPending}
              onClick={() => publish.mutate()}
            >
              {publish.isPending && <Spinner />}
              Publish results
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
