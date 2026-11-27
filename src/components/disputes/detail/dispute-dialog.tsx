"use client";
import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/misc";
import { AcceptResolutionPanel } from "@/components/disputes/detail/accept-resolution-panel";
import { DisputeCommentForm } from "@/components/disputes/detail/dispute-comment-form";
import { DisputeDecisionForm } from "@/components/disputes/detail/dispute-decision-form";
import { DisputeOverview } from "@/components/disputes/detail/dispute-overview";
import { DisputeTimeline } from "@/components/disputes/detail/dispute-timeline";
import { EscalateDisputeForm } from "@/components/disputes/detail/escalate-dispute-form";
import { useDisputeDetail } from "@/components/disputes/detail/use-dispute-detail";

/** Dispute detail and workflow actions for every role; `allowed` decides what shows. */
export function DisputeDialog({
  disputeId,
  onOpenChange,
}: {
  disputeId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [comment, setComment] = useState("");
  const [escalating, setEscalating] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");

  const { query: q, act, can } = useDisputeDetail(disputeId, () => {
    setComment("");
    setEscalating(false);
  });
  const d = q.data;

  return (
    <Dialog open={disputeId !== null} onOpenChange={onOpenChange}>
      <DialogContent
        title={d ? `Dispute: ${d.questionNumber ? `Question ${d.questionNumber}` : "Overall result"}` : "Dispute"}
        description={d ? `${d.examTitle} · ${d.candidateName}` : undefined}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        {q.isPending || !d ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="space-y-5">
            <DisputeOverview d={d} />

            <section aria-label="Timeline" className="space-y-2">
              <h3 className="text-sm font-semibold">Timeline</h3>
              <DisputeTimeline events={d.events} />
            </section>

            {can("COMMENT") && (
              <DisputeCommentForm
                value={comment}
                onChange={setComment}
                pending={act.isPending}
                onSubmit={() => act.mutate({ action: "COMMENT", message: comment })}
              />
            )}

            {(can("RESOLVE") || can("DECIDE")) && (
              <DisputeDecisionForm
                d={d}
                action={can("DECIDE") ? "DECIDE" : "RESOLVE"}
                pending={act.isPending}
                onSubmit={(v) => act.mutate({ action: can("DECIDE") ? "DECIDE" : "RESOLVE", ...v })}
              />
            )}

            {can("ACCEPT") && !escalating && (
              <AcceptResolutionPanel
                d={d}
                canEscalate={can("ESCALATE")}
                pending={act.isPending}
                onEscalate={() => setEscalating(true)}
                onAccept={() => act.mutate({ action: "ACCEPT" })}
              />
            )}

            {escalating && (
              <EscalateDisputeForm
                reason={escalateReason}
                onReasonChange={setEscalateReason}
                pending={act.isPending}
                onBack={() => setEscalating(false)}
                onSubmit={() => act.mutate({ action: "ESCALATE", reason: escalateReason })}
              />
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {can("START_REVIEW") && (
                <Button variant="outline" disabled={act.isPending} onClick={() => act.mutate({ action: "START_REVIEW" })}>
                  Start review
                </Button>
              )}
              {can("WITHDRAW") && (
                <Button
                  variant="outline"
                  disabled={act.isPending}
                  onClick={() => {
                    if (confirm("Withdraw this dispute? You can file a new one while the dispute window is open."))
                      act.mutate({ action: "WITHDRAW" });
                  }}
                >
                  <Undo2 className="h-4 w-4" />
                  Withdraw
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
