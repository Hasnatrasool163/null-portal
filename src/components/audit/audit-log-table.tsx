import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  AUDIT_ACTION_LABEL,
  type AuditAction,
  type AuditList,
} from "@/shared/schemas/audit";

function actionClass(a: AuditAction) {
  if (a === "GRADE_CHANGED" || a === "LATE_ANSWER_DISCARDED")
    return "bg-warning/15 text-warning";
  if (a === "ROLE_CHANGED" || a === "USER_DEACTIVATED" || a === "EXAM_CLOSED")
    return "bg-destructive/15 text-destructive";
  if (a === "RESULTS_PUBLISHED" || a === "EXAM_PUBLISHED")
    return "bg-success/15 text-success";
  return "";
}

/**
 * Audit entries in the order served. `showExam` adds a link to each
 * entry's exam (used by the platform-wide log, where entries span exams).
 */
export function AuditLogTable({
  items,
  showExam,
}: {
  items: AuditList["items"];
  showExam: boolean;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>When</TH>
          <TH>Who</TH>
          <TH>Action</TH>
          <TH>Details</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((e) => (
          <TR key={e.id}>
            <TD className="text-muted-foreground text-xs whitespace-nowrap">
              {/* Seconds matter in an audit trail, so not the shared formatDateTime. */}
              {format(new Date(e.createdAt), "PP HH:mm:ss")}
            </TD>
            <TD>
              <p className="font-medium">{e.actorName}</p>
              <p className="text-muted-foreground text-xs">
                {e.actorRole.charAt(0) + e.actorRole.slice(1).toLowerCase()}
              </p>
            </TD>
            <TD>
              <Badge className={actionClass(e.action)}>
                {AUDIT_ACTION_LABEL[e.action] ?? e.action}
              </Badge>
            </TD>
            <TD className="max-w-md text-sm">
              <p className="break-words">{e.summary}</p>
              {showExam && e.examId && (
                <Link
                  href={`/exams/${e.examId}`}
                  className="text-muted-foreground text-xs underline-offset-2 hover:underline"
                >
                  {e.examTitle ?? "Deleted exam"}
                </Link>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
