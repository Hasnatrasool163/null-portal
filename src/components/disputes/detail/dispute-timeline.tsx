"use client";
import { format } from "date-fns";
import {
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
import { formatRelative, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  OUTCOME_LABEL,
  type DisputeDetail,
  type DisputeEventKind,
  type DisputeOutcome,
} from "@/shared/schemas/dispute";

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

/** Chronological audit trail of everything that happened on a dispute. */
export function DisputeTimeline({ events }: { events: DisputeDetail["events"] }) {
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
                    {formatRelative(e.createdAt)}
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
                  Total score {formatScore(d.scoreBefore)} → {formatScore(d.scoreAfter ?? d.scoreBefore)}
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
