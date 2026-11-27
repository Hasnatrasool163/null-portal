"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/blocks";
import { DisputeDialog } from "@/components/disputes/detail/dispute-dialog";
import { DisputeTable } from "@/components/disputes/list/dispute-table";
import { NeedsActionNote } from "@/components/disputes/list/needs-action-note";
import { disputesApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { DISPUTE_STATUSES, STATUS_LABEL, type DisputeStatus } from "@/shared/schemas/dispute";

/** Admin queue across all exams: escalated first. */
export function AdminDisputes() {
  const [status, setStatus] = useState<DisputeStatus | "">("ESCALATED");
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: qk.disputes.admin(status),
    queryFn: () => disputesApi.adminQueue(status),
  });

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="d-status" className="text-sm font-medium">
          Status
        </label>
        <div className="w-56">
          <Select id="d-status" value={status} onChange={(e) => setStatus(e.target.value as DisputeStatus | "")}>
            <option value="">All disputes</option>
            {DISPUTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {q.isPending ? (
        <Skeleton className="h-48 w-full" />
      ) : q.isError ? (
        <EmptyState
          title="Could not load disputes"
          text={q.error.message}
          action={<Button onClick={() => q.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <NeedsActionNote
            count={q.data.filter((d) => d.status === "ESCALATED").length}
            text="escalated dispute(s) waiting for a final decision."
          />
          {q.data.length === 0 ? (
            <EmptyState
              title={status === "ESCALATED" ? "Nothing escalated" : "No disputes"}
              text={status === "ESCALATED" ? "No candidate is waiting on an admin decision." : "No disputes match this filter."}
            />
          ) : (
            <DisputeTable disputes={q.data} onOpen={setOpen} showExam />
          )}
        </>
      )}
      <DisputeDialog disputeId={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
