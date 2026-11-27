"use client";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import {
  INCIDENT_LABEL,
  type MonitorAttempt,
} from "@/shared/schemas/monitoring";

/** Advisory activity log (incidents + granted extensions) for one attempt. */
export function IncidentLogDialog({
  attempt,
  onClose,
}: {
  attempt: MonitorAttempt | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={attempt !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
        title={
          attempt ? `Activity log — ${attempt.candidateName}` : "Activity log"
        }
        description="Advisory indicators only — not proof of misconduct. Never auto-penalized."
      >
        {attempt && (
          <div className="space-y-4 text-sm">
            <p className="bg-muted text-muted-foreground rounded-md p-3 text-xs">
              Events below are browser-reported signals (e.g. tab switch,
              network drop). They are advisory indicators, not proof of
              misconduct, and never deduct marks automatically.
            </p>

            {attempt.extensions.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4" />
                  Granted time extensions
                </h3>
                <ul className="divide-y rounded-md border text-xs">
                  {attempt.extensions.map((ex) => (
                    <li key={ex.id} className="p-2.5">
                      <b>+{ex.minutes} min</b> — {ex.reason}{" "}
                      <span className="text-muted-foreground">
                        ({ex.grantedByName}, {formatDateTime(ex.createdAt)})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {attempt.incidents.length === 0 ? (
              <p className="text-muted-foreground">
                No advisory events recorded for this attempt.
              </p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Event</TH>
                    <TH>Server time</TH>
                  </TR>
                </THead>
                <TBody>
                  {attempt.incidents.map((inc) => (
                    <TR key={inc.id}>
                      <TD>
                        <Badge>{INCIDENT_LABEL[inc.type]}</Badge>
                      </TD>
                      <TD className="text-muted-foreground text-xs">
                        {format(new Date(inc.occurredAt), "PP pp")}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
