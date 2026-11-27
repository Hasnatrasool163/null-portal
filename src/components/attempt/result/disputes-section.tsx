import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisputeStatusBadge } from "@/components/disputes/dispute-views";
import { formatScore, formatShortDateTime } from "@/lib/format";
import { CATEGORY_LABEL, type AttemptDisputes } from "@/shared/schemas/dispute";

// Shown to examiners/admins viewing a result; the generic copy reads better for them.
const CANDIDATE_ONLY_REASON = "Only the candidate can file a dispute.";

function disputesIntro(
  disputes: AttemptDisputes | undefined,
  canFile: boolean,
) {
  if (canFile && disputes?.fileBy)
    return `Think a mark is wrong, a question was flawed, or a technical problem affected you? You can raise a dispute until ${formatShortDateTime(disputes.fileBy)}.`;
  if (
    disputes?.cannotFileReason &&
    disputes.cannotFileReason !== CANDIDATE_ONLY_REASON
  )
    return disputes.cannotFileReason;
  return "Every dispute gets a written decision and a visible timeline.";
}

/** "Disputes" section: explains the window, lists filed disputes, opens one on click. */
export function DisputesSection({
  disputes,
  canFile,
  onRaiseDispute,
  onOpenDispute,
}: {
  disputes: AttemptDisputes | undefined;
  canFile: boolean;
  onRaiseDispute: () => void;
  onOpenDispute: (disputeId: string) => void;
}) {
  return (
    <section
      id="disputes"
      className="scroll-mt-20 space-y-3"
      aria-labelledby="disputes-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-2.5">
        <div>
          <h2
            id="disputes-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Disputes
          </h2>
          <p className="text-muted-foreground text-xs">
            {disputesIntro(disputes, canFile)}
          </p>
        </div>
        {canFile && (
          <Button size="sm" variant="outline" onClick={onRaiseDispute}>
            <Scale className="h-4 w-4" />
            Raise a dispute
          </Button>
        )}
      </div>
      {(disputes?.disputes.length ?? 0) === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">
          No disputes for this result.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {disputes!.disputes.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onOpenDispute(d.id)}
                className="hover:bg-muted flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left text-sm"
              >
                <span className="font-medium">
                  {d.questionNumber
                    ? `Question ${d.questionNumber}`
                    : "Overall result"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {CATEGORY_LABEL[d.category]}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  {d.scoreAfter !== null &&
                    d.scoreAfter !== d.scoreAtFiling && (
                      <span className="text-xs tabular-nums">
                        {formatScore(d.scoreAtFiling)} →{" "}
                        <b>{formatScore(d.scoreAfter)}</b>
                      </span>
                    )}
                  <DisputeStatusBadge status={d.status} outcome={d.outcome} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
