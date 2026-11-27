"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Gavel,
  MessageSquare,
  Scale,
  ShieldAlert,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, Skeleton, Spinner } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { api, ApiClientError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  CATEGORY_HINT,
  CATEGORY_LABEL,
  DISPUTE_CATEGORIES,
  DISPUTE_ESCALATION_DAYS,
  DISPUTE_OUTCOMES,
  OUTCOME_LABEL,
  STATUS_LABEL,
  type DisputeActionInput,
  type DisputeCategory,
  type DisputeDetail,
  type DisputeEventKind,
  type DisputeOutcome,
  type DisputeStatus,
  type DisputeSummary,
} from "@/shared/schemas/dispute";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const STATUS_TONE: Record<DisputeStatus, string> = {
  OPEN: "bg-warning/15 text-warning",
  UNDER_REVIEW: "bg-primary/15 text-primary",
  RESOLVED: "bg-success/15 text-success",
  ESCALATED: "bg-destructive/15 text-destructive",
  CLOSED: "bg-muted text-muted-foreground",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

export function DisputeStatusBadge({
  status,
  outcome,
}: {
  status: DisputeStatus;
  outcome: DisputeOutcome | null;
}) {
  return (
    <Badge className={STATUS_TONE[status]}>
      {STATUS_LABEL[status]}
      {outcome && (status === "RESOLVED" || status === "CLOSED") && ` · ${OUTCOME_LABEL[outcome]}`}
    </Badge>
  );
}

/** Invalidate everything a dispute change can affect (lists, detail, the result score). */
function useRefreshDisputes() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["disputes"] });
    qc.invalidateQueries({ queryKey: ["dispute"] });
    qc.invalidateQueries({ queryKey: ["attempt-result"] });
    qc.invalidateQueries({ queryKey: ["exam-grading"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

/* ---------------- Filing (candidate) ---------------- */

export function FileDisputeDialog({
  open,
  onOpenChange,
  attemptId,
  questions,
  initialQuestionId,
  fileBy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  attemptId: string;
  questions: { attemptQuestionId: string; position: number }[];
  initialQuestionId?: string;
  fileBy: string | null;
}) {
  const refresh = useRefreshDisputes();
  const [questionId, setQuestionId] = useState(initialQuestionId ?? "");
  const [category, setCategory] = useState<DisputeCategory>("GRADING_ERROR");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const file = useMutation({
    mutationFn: () =>
      api(`/api/attempts/${attemptId}/disputes`, {
        method: "POST",
        body: { attemptQuestionId: questionId || undefined, category, reason },
      }),
    onSuccess: () => {
      toast.success("Dispute filed. The examiner has been notified.");
      setReason("");
      onOpenChange(false);
      refresh();
    },
    onError: (e) => {
      if (e instanceof ApiClientError && e.fields) setErrors(e.fields);
      else toast.error(e.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Raise a dispute"
        description={`Explain what you think is wrong. The examiner must reply with a written decision, and you can escalate it to an administrator if you disagree.${fileBy ? ` Open until ${format(new Date(fileBy), "MMM d, p")}.` : ""}`}
        className="max-w-lg overflow-y-auto"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErrors({});
            file.mutate();
          }}
        >
          <Field label="What is it about?" htmlFor="d-question">
            <Select id="d-question" value={questionId} onChange={(e) => setQuestionId(e.target.value)}>
              <option value="">The overall result</option>
              {questions.map((q) => (
                <option key={q.attemptQuestionId} value={q.attemptQuestionId}>
                  Question {q.position + 1}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium">Reason</legend>
            {DISPUTE_CATEGORIES.map((c) => (
              <label
                key={c}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors",
                  category === c ? "border-primary bg-primary/5" : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="accent-primary mt-0.5"
                />
                <span>
                  <span className="block font-medium">{CATEGORY_LABEL[c]}</span>
                  <span className="text-muted-foreground block text-xs">{CATEGORY_HINT[c]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <Field
            label="Explanation"
            htmlFor="d-reason"
            error={errors.reason}
            hint="At least 20 characters. Be specific: what you answered, and why it deserves a different mark."
          >
            <Textarea
              id="d-reason"
              rows={5}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!errors.reason}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={file.isPending || reason.trim().length < 20}>
              {file.isPending && <Spinner />}
              File dispute
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Detail + actions (all roles) ---------------- */

const EVENT_META: Record<DisputeEventKind, { icon: LucideIcon; label: string; tone: string }> = {
  FILED: { icon: Scale, label: "filed the dispute", tone: "text-warning" },
  COMMENT: { icon: MessageSquare, label: "commented", tone: "text-muted-foreground" },
  REVIEW_STARTED: { icon: CircleDot, label: "started reviewing", tone: "text-primary" },
  SCORE_CHANGED: { icon: ArrowRight, label: "changed the mark", tone: "text-primary" },
  RESOLVED: { icon: CheckCircle2, label: "resolved the dispute", tone: "text-success" },
  ACCEPTED: { icon: CheckCircle2, label: "accepted the resolution", tone: "text-success" },
  ESCALATED: { icon: ShieldAlert, label: "escalated to an administrator", tone: "text-destructive" },
  DECIDED: { icon: Gavel, label: "made the final decision", tone: "text-success" },
  WITHDRAWN: { icon: Undo2, label: "withdrew the dispute", tone: "text-muted-foreground" },
};

function Timeline({ events }: { events: DisputeDetail["events"] }) {
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const m = EVENT_META[e.kind];
        const d = e.details as {
          outcome?: DisputeOutcome;
          from?: number | null;
          to?: number;
          questionNumber?: number;
          scoreBefore?: number;
          scoreAfter?: number;
        };
        return (
          <li key={e.id} className="flex gap-3">
            <m.icon className={cn("mt-0.5 h-4 w-4 shrink-0", m.tone)} aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p>
                <span className="font-medium">{e.actorName}</span>{" "}
                <span className="text-muted-foreground text-xs">({e.actorRole.toLowerCase()})</span>{" "}
                {m.label}
                {d.outcome && <>: <b>{OUTCOME_LABEL[d.outcome]}</b></>}
                <span className="text-muted-foreground text-xs">
                  {" · "}
                  <time dateTime={e.createdAt} title={format(new Date(e.createdAt), "PPpp")}>
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                  </time>
                </span>
              </p>
              {e.kind === "SCORE_CHANGED" && (
                <p className="text-muted-foreground text-xs">
                  Q{d.questionNumber}: {d.from ?? "–"} → {d.to}
                </p>
              )}
              {(e.kind === "RESOLVED" || e.kind === "DECIDED") && d.scoreBefore !== undefined && (
                <p className="text-muted-foreground text-xs">
                  Total score {fmt(d.scoreBefore)} → {fmt(d.scoreAfter ?? d.scoreBefore)}
                </p>
              )}
              {e.message && (
                <p className="bg-muted/60 mt-1 rounded-md px-3 py-2 leading-relaxed whitespace-pre-wrap">
                  {e.message}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DecisionForm({
  d,
  action,
  pending,
  onSubmit,
}: {
  d: DisputeDetail;
  action: "RESOLVE" | "DECIDE";
  pending: boolean;
  onSubmit: (v: { outcome: DisputeOutcome; rationale: string; newScore?: number }) => void;
}) {
  const [outcome, setOutcome] = useState<DisputeOutcome>("REJECTED");
  const [rationale, setRationale] = useState("");
  const written = d.question?.type === "WRITTEN";
  const [mark, setMark] = useState(written && d.question?.score !== null ? String(d.question?.score) : "");
  const markNum = mark.trim() === "" ? undefined : Number(mark);
  const markChanged = written && markNum !== undefined && markNum !== d.question?.score;
  const objective = d.question && !written;

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ outcome, rationale, newScore: markChanged && outcome !== "REJECTED" ? markNum : undefined });
      }}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Gavel className="h-4 w-4" aria-hidden="true" />
        {action === "DECIDE" ? "Final decision (cannot be appealed)" : "Resolve this dispute"}
      </p>
      <Field label="Outcome" htmlFor="d-outcome">
        <Select id="d-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as DisputeOutcome)}>
          {DISPUTE_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABEL[o]}
            </option>
          ))}
        </Select>
      </Field>
      {written && outcome !== "REJECTED" && (
        <Field
          label={`Corrected mark for Q${d.question!.position + 1} (out of ${d.question!.marks})`}
          htmlFor="d-mark"
          hint="Leave unchanged if no mark change is needed. The change is audited and linked to this dispute."
        >
          <Input
            id="d-mark"
            type="number"
            step={0.5}
            min={0}
            max={d.question!.marks}
            value={mark}
            onChange={(e) => setMark(e.target.value)}
          />
        </Field>
      )}
      {objective && outcome !== "REJECTED" && (
        <p className="border-warning/40 bg-warning/10 rounded-md border px-3 py-2 text-xs leading-relaxed">
          To change marks on an objective question, use <b>Answer-key rescore</b> on the exam first. It
          corrects the key for every candidate, not just this one, so the result stays fair. Then resolve
          here; the new score is recorded automatically.
        </p>
      )}
      <Field label="Written rationale" htmlFor="d-rationale" hint="Shown to the candidate. At least 20 characters.">
        <Textarea id="d-rationale" rows={4} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || rationale.trim().length < 20}>
          {pending && <Spinner />}
          {action === "DECIDE" ? "Record final decision" : "Resolve"}
        </Button>
      </div>
    </form>
  );
}

export function DisputeDialog({
  disputeId,
  onOpenChange,
}: {
  disputeId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const refresh = useRefreshDisputes();
  const [comment, setComment] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");

  const q = useQuery({
    queryKey: ["dispute", disputeId],
    queryFn: () => api<DisputeDetail>(`/api/disputes/${disputeId}`),
    enabled: disputeId !== null,
  });
  const act = useMutation({
    mutationFn: (body: DisputeActionInput) =>
      api(`/api/disputes/${disputeId}`, { method: "POST", body }),
    onSuccess: (_, body) => {
      const msg: Record<DisputeActionInput["action"], string> = {
        COMMENT: "Comment added",
        START_REVIEW: "Marked as under review",
        RESOLVE: "Dispute resolved. The candidate has been notified.",
        ACCEPT: "Resolution accepted. The dispute is closed.",
        ESCALATE: "Escalated to an administrator",
        DECIDE: "Final decision recorded",
        WITHDRAW: "Dispute withdrawn",
      };
      toast.success(msg[body.action]);
      setComment("");
      setEscalating(false);
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const d = q.data;
  const can = (a: DisputeActionInput["action"]) => d?.allowed.includes(a) ?? false;

  return (
    <Dialog open={disputeId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title={d ? `Dispute: ${d.questionNumber ? `Question ${d.questionNumber}` : "Overall result"}` : "Dispute"}
        description={d ? `${d.examTitle} · ${d.candidateName}` : undefined}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        {q.isPending || !d ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <DisputeStatusBadge status={d.status} outcome={d.outcome} />
              <Badge>{CATEGORY_LABEL[d.category]}</Badge>
              <span className="text-muted-foreground ml-auto tabular-nums">
                Score at filing <b className="text-foreground">{fmt(d.scoreAtFiling)}</b>
                {d.scoreAfter !== null && d.scoreAfter !== d.scoreAtFiling && (
                  <> → <b className="text-foreground">{fmt(d.scoreAfter)}</b></>
                )}{" "}
                / {fmt(d.totalMarks)}
              </span>
            </div>

            {d.question && (
              <div className="space-y-2 rounded-md border p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    Q{d.question.position + 1}. {d.question.body}
                  </p>
                  <span className="shrink-0 tabular-nums">
                    {d.question.score === null ? "–" : fmt(d.question.score)} / {fmt(d.question.marks)}
                  </span>
                </div>
                {d.question.type === "WRITTEN" ? (
                  <p className="text-muted-foreground border-l-2 pl-3 whitespace-pre-wrap">
                    {d.question.textAnswer?.trim() || <i>No answer provided.</i>}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Answered: {d.question.selected.join(", ") || "nothing"}
                    {d.question.correct && <> · Answer key: {d.question.correct.join(", ")}</>}
                  </p>
                )}
                {d.question.feedback && (
                  <p className="text-muted-foreground text-xs">Feedback: {d.question.feedback}</p>
                )}
              </div>
            )}

            {d.incidents.length > 0 && (
              <details className="rounded-md border px-4 py-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  Technical evidence: {d.incidents.length} logged incident(s) during this attempt
                </summary>
                <ul className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                  {d.incidents.map((i, n) => (
                    <li key={n}>
                      {format(new Date(i.occurredAt), "MMM d, HH:mm:ss")} · {i.type.replace(/_/g, " ").toLowerCase()}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <section aria-label="Timeline" className="space-y-2">
              <h3 className="text-sm font-semibold">Timeline</h3>
              <Timeline events={d.events} />
            </section>

            {can("COMMENT") && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  act.mutate({ action: "COMMENT", message: comment });
                }}
              >
                <Input
                  aria-label="Add a comment"
                  placeholder="Add a comment visible to everyone on this dispute"
                  value={comment}
                  maxLength={2000}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button type="submit" variant="outline" disabled={act.isPending || comment.trim().length < 2}>
                  Send
                </Button>
              </form>
            )}

            {(can("RESOLVE") || can("DECIDE")) && (
              <DecisionForm
                d={d}
                action={can("DECIDE") ? "DECIDE" : "RESOLVE"}
                pending={act.isPending}
                onSubmit={(v) => act.mutate({ action: can("DECIDE") ? "DECIDE" : "RESOLVE", ...v })}
              />
            )}

            {can("ACCEPT") && !escalating && (
              <div className="bg-muted/50 space-y-3 rounded-md p-4 text-sm">
                <p>
                  The examiner resolved this as <b>{OUTCOME_LABEL[d.outcome!]}</b>. If you disagree you can escalate it once
                  to an administrator for an independent, final decision
                  {d.escalateBy && <> (until {format(new Date(d.escalateBy), "MMM d, p")})</>}. Otherwise it becomes final
                  after {DISPUTE_ESCALATION_DAYS} days.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  {can("ESCALATE") && (
                    <Button variant="outline" onClick={() => setEscalating(true)}>
                      <ShieldAlert className="h-4 w-4" />
                      Escalate to admin
                    </Button>
                  )}
                  <Button disabled={act.isPending} onClick={() => act.mutate({ action: "ACCEPT" })}>
                    <CheckCircle2 className="h-4 w-4" />
                    Accept resolution
                  </Button>
                </div>
              </div>
            )}

            {escalating && (
              <form
                className="space-y-3 rounded-md border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  act.mutate({ action: "ESCALATE", reason: escalateReason });
                }}
              >
                <Field label="Why do you disagree with the resolution?" htmlFor="d-esc" hint="At least 20 characters. You can only escalate once.">
                  <Textarea id="d-esc" rows={4} maxLength={2000} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEscalating(false)}>
                    Back
                  </Button>
                  <Button type="submit" disabled={act.isPending || escalateReason.trim().length < 20}>
                    {act.isPending && <Spinner />}
                    Escalate
                  </Button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {can("START_REVIEW") && (
                <Button variant="outline" disabled={act.isPending} onClick={() => act.mutate({ action: "START_REVIEW" })}>
                  Start review
                </Button>
              )}
              {can("WITHDRAW") && (
                <Button
                  variant="outline"
                  disabled={act.isPending}
                  onClick={() => {
                    if (confirm("Withdraw this dispute? You can file a new one while the dispute window is open."))
                      act.mutate({ action: "WITHDRAW" });
                  }}
                >
                  <Undo2 className="h-4 w-4" />
                  Withdraw
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Lists ---------------- */

export function DisputeTable({
  disputes,
  onOpen,
  showExam = false,
}: {
  disputes: DisputeSummary[];
  onOpen: (id: string) => void;
  showExam?: boolean;
}) {
  return (
    <Table>
      <THead>
        <TR>
          {showExam && <TH>Exam</TH>}
          <TH>Candidate</TH>
          <TH>About</TH>
          <TH>Reason</TH>
          <TH>Status</TH>
          <TH>Score</TH>
          <TH>Updated</TH>
          <TH className="text-right">Action</TH>
        </TR>
      </THead>
      <TBody>
        {disputes.map((d) => (
          <TR key={d.id}>
            {showExam && <TD className="max-w-48 truncate">{d.examTitle}</TD>}
            <TD className="font-medium">{d.candidateName}</TD>
            <TD>{d.questionNumber ? `Q${d.questionNumber}` : "Overall"}</TD>
            <TD className="text-muted-foreground text-xs">{CATEGORY_LABEL[d.category]}</TD>
            <TD>
              <DisputeStatusBadge status={d.status} outcome={d.outcome} />
            </TD>
            <TD className="tabular-nums">
              {fmt(d.scoreAtFiling)}
              {d.scoreAfter !== null && d.scoreAfter !== d.scoreAtFiling && <> → {fmt(d.scoreAfter)}</>}
              <span className="text-muted-foreground"> / {fmt(d.totalMarks)}</span>
            </TD>
            <TD className="text-muted-foreground text-xs">
              {formatDistanceToNow(new Date(d.updatedAt), { addSuffix: true })}
            </TD>
            <TD className="text-right">
              <Button
                size="sm"
                variant={d.status === "OPEN" || d.status === "UNDER_REVIEW" || d.status === "ESCALATED" ? "default" : "outline"}
                onClick={() => onOpen(d.id)}
              >
                Open
              </Button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function NeedsActionNote({ count, text }: { count: number; text: string }) {
  if (count === 0) return null;
  return (
    <p className="border-warning/40 bg-warning/10 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <AlertTriangle className="text-warning h-4 w-4 shrink-0" aria-hidden="true" />
      {count} {text}
    </p>
  );
}
