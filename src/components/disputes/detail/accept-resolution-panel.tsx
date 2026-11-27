"use client";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatShortDateTime } from "@/lib/format";
import {
  DISPUTE_ESCALATION_DAYS,
  OUTCOME_LABEL,
  type DisputeDetail,
} from "@/shared/schemas/dispute";

/** Candidate's choice after a resolution: accept it, or escalate once to an admin. */
export function AcceptResolutionPanel({
  d,
  canEscalate,
  pending,
  onEscalate,
  onAccept,
}: {
  d: DisputeDetail;
  canEscalate: boolean;
  pending: boolean;
  onEscalate: () => void;
  onAccept: () => void;
}) {
  return (
    <div className="bg-muted/50 space-y-3 rounded-md p-4 text-sm">
      <p>
        The examiner resolved this as <b>{OUTCOME_LABEL[d.outcome!]}</b>. If you disagree you can escalate it once
        to an administrator for an independent, final decision
        {d.escalateBy && <> (until {formatShortDateTime(d.escalateBy)})</>}. Otherwise it becomes final
        after {DISPUTE_ESCALATION_DAYS} days.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        {canEscalate && (
          <Button variant="outline" onClick={onEscalate}>
            <ShieldAlert className="h-4 w-4" />
            Escalate to admin
          </Button>
        )}
        <Button disabled={pending} onClick={onAccept}>
          <CheckCircle2 className="h-4 w-4" />
          Accept resolution
        </Button>
      </div>
    </div>
  );
}
