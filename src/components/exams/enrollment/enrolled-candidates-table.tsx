"use client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { EnrolledCandidate } from "@/shared/schemas/exam";

/** One page of the exam roster, with optional per-row removal. */
export function EnrolledCandidatesTable({
  rows,
  canRemove,
  removing,
  onRemove,
}: {
  rows: EnrolledCandidate[];
  canRemove: boolean;
  removing: boolean;
  onRemove: (candidateId: string) => void;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Name</TH>
          <TH>Email</TH>
          <TH>Enrolled</TH>
          {canRemove && <TH className="text-right">Remove</TH>}
        </TR>
      </THead>
      <TBody>
        {rows.map((c) => (
          <TR key={c.id}>
            <TD className="font-medium">{c.name}</TD>
            <TD>{c.email}</TD>
            <TD className="text-muted-foreground text-xs">
              {formatDateTime(c.enrolledAt)}
            </TD>
            {canRemove && (
              <TD className="text-right">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${c.name}`}
                  disabled={removing}
                  onClick={() => onRemove(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
