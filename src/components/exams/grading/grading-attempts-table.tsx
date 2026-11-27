"use client";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { GradingAttemptSummary } from "@/shared/schemas/grading";

function gradingTone(status: GradingAttemptSummary["gradingStatus"]) {
  return status === "NEEDS_REVIEW"
    ? "bg-warning/15 text-warning"
    : status === "GRADED" || status === "AUTO_GRADED"
      ? "bg-success/15 text-success"
      : "bg-muted text-muted-foreground";
}

function gradingLabel(a: GradingAttemptSummary) {
  return a.gradingStatus === "NEEDS_REVIEW"
    ? `${a.pendingWrittenCount} written left`
    : a.gradingStatus === "GRADED"
      ? "Graded"
      : a.gradingStatus === "AUTO_GRADED"
        ? "Auto-graded"
        : "Not submitted";
}

/** "By candidate" grading list: one row per attempt with its grade action. */
export function GradingAttemptsTable({
  attempts,
  readOnly,
  onOpen,
}: {
  attempts: GradingAttemptSummary[];
  readOnly: boolean;
  onOpen: (attemptId: string) => void;
}) {
  return (
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
        {attempts.map((a) => {
          const needsGrading = a.gradingStatus === "NEEDS_REVIEW" && !readOnly;
          return (
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
                <Badge className={gradingTone(a.gradingStatus)}>
                  {gradingLabel(a)}
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
                {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
              </TD>
              <TD className="text-right">
                <Button
                  size="sm"
                  variant={needsGrading ? "default" : "outline"}
                  disabled={a.status !== "SUBMITTED"}
                  onClick={() => onOpen(a.attemptId)}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {needsGrading ? "Grade" : "Inspect"}
                </Button>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
