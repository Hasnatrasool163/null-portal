"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { DisputeDialog, DisputeTable, NeedsActionNote } from "@/components/dispute-views";
import { api } from "@/lib/api-client";
import type { DisputeSummary } from "@/shared/schemas/dispute";

/** Examiner (owner) and admin view of an exam's disputes. */
export function ExamDisputesTab({ examId, isAdmin }: { examId: string; isAdmin: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["disputes", "exam", examId],
    queryFn: () => api<DisputeSummary[]>(`/api/exams/${examId}/disputes`),
  });

  if (q.isPending) return <Skeleton className="h-48 w-full" />;
  if (q.isError) {
    return (
      <EmptyState
        title="Could not load disputes"
        text={q.error.message}
        action={<Button onClick={() => q.refetch()}>Try again</Button>}
      />
    );
  }
  const waiting = q.data.filter((d) =>
    isAdmin ? d.status === "ESCALATED" : d.status === "OPEN" || d.status === "UNDER_REVIEW",
  ).length;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Candidates can dispute a published result for 7 days. Each dispute needs a written decision. Mark
        changes are audited and linked to the dispute, and certificates issued before a change verify as
        superseded. Candidates may escalate a resolution once to an administrator for a final decision.
      </p>
      <NeedsActionNote
        count={waiting}
        text={isAdmin ? "escalated dispute(s) waiting for a final decision." : "dispute(s) waiting for your decision."}
      />
      {q.data.length === 0 ? (
        <EmptyState title="No disputes" text="No candidate has disputed a result for this exam." />
      ) : (
        <DisputeTable disputes={q.data} onOpen={setOpen} />
      )}
      <DisputeDialog disputeId={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
