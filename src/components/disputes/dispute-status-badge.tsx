"use client";
import { Badge } from "@/components/ui/misc";
import {
  OUTCOME_LABEL,
  STATUS_LABEL,
  type DisputeOutcome,
  type DisputeStatus,
} from "@/shared/schemas/dispute";

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
