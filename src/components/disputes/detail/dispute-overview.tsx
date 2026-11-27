"use client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/misc";
import { DisputeStatusBadge } from "@/components/disputes/dispute-status-badge";
import { formatScore } from "@/lib/format";
import { CATEGORY_LABEL, type DisputeDetail } from "@/shared/schemas/dispute";

/** Status and score line, the disputed question with the candidate's answer, and logged incidents. */
export function DisputeOverview({ d }: { d: DisputeDetail }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <DisputeStatusBadge status={d.status} outcome={d.outcome} />
        <Badge>{CATEGORY_LABEL[d.category]}</Badge>
        <span className="text-muted-foreground ml-auto tabular-nums">
          Score at filing <b className="text-foreground">{formatScore(d.scoreAtFiling)}</b>
          {d.scoreAfter !== null && d.scoreAfter !== d.scoreAtFiling && (
            <> → <b className="text-foreground">{formatScore(d.scoreAfter)}</b></>
          )}{" "}
          / {formatScore(d.totalMarks)}
        </span>
      </div>

      {d.question && (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              Q{d.question.position + 1}. {d.question.body}
            </p>
            <span className="shrink-0 tabular-nums">
              {d.question.score === null ? "–" : formatScore(d.question.score)} / {formatScore(d.question.marks)}
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
    </>
  );
}
