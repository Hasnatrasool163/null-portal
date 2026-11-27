import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { ExamSummary } from "@/shared/schemas/exam";
import { PhaseStatus } from "./phase-status";

/** One page of exams; admins additionally see the owning examiner. */
export function ExamsTable({
  exams,
  isAdmin,
}: {
  exams: ExamSummary[];
  isAdmin: boolean;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Title</TH>
          {isAdmin && <TH>Examiner</TH>}
          <TH>Phase</TH>
          <TH>Window</TH>
          <TH>Questions / Marks</TH>
          <TH>Enrolled</TH>
          <TH className="text-right">Action</TH>
        </TR>
      </THead>
      <TBody>
        {exams.map((e) => (
          <TR key={e.id}>
            <TD>
              <Link
                href={`/exams/${e.id}`}
                className="font-medium hover:underline"
              >
                {e.title}
              </Link>
              <p className="text-muted-foreground text-xs">
                {e.durationMinutes} min
              </p>
            </TD>
            {isAdmin && <TD>{e.ownerName}</TD>}
            <TD>
              <PhaseStatus phase={e.phase} />
            </TD>
            <TD className="text-xs whitespace-nowrap">
              <div>{formatDateTime(e.startsAt)}</div>
              <div className="text-muted-foreground">
                to {formatDateTime(e.endsAt)}
              </div>
            </TD>
            <TD>
              {e.questionCount} Q / {e.totalMarks} pts
            </TD>
            <TD>{e.enrollmentCount}</TD>
            <TD className="text-right">
              <Button asChild size="sm" variant="outline">
                <Link href={`/exams/${e.id}`}>
                  {isAdmin ? "Inspect" : "Manage"}
                </Link>
              </Button>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
