"use client";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DisputeStatusBadge } from "@/components/disputes/dispute-status-badge";
import { formatRelative, formatScore } from "@/lib/format";
import { CATEGORY_LABEL, type DisputeSummary } from "@/shared/schemas/dispute";

/** Dispute list for examiners and admins; `showExam` adds the exam column. */
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
              {formatScore(d.scoreAtFiling)}
              {d.scoreAfter !== null && d.scoreAfter !== d.scoreAtFiling && <> → {formatScore(d.scoreAfter)}</>}
              <span className="text-muted-foreground"> / {formatScore(d.totalMarks)}</span>
            </TD>
            <TD className="text-muted-foreground text-xs">
              {formatRelative(d.updatedAt)}
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
