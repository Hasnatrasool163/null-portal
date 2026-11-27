"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRefreshDisputes } from "@/components/disputes/use-refresh-disputes";
import { disputesApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { DisputeActionInput } from "@/shared/schemas/dispute";

const ACTION_SUCCESS: Record<DisputeActionInput["action"], string> = {
  COMMENT: "Comment added",
  START_REVIEW: "Marked as under review",
  RESOLVE: "Dispute resolved. The candidate has been notified.",
  ACCEPT: "Resolution accepted. The dispute is closed.",
  ESCALATE: "Escalated to an administrator",
  DECIDE: "Final decision recorded",
  WITHDRAW: "Dispute withdrawn",
};

/**
 * Load one dispute and expose the workflow action mutation. `onActed` runs
 * after any successful action (before caches are refreshed).
 */
export function useDisputeDetail(disputeId: string | null, onActed: () => void) {
  const refresh = useRefreshDisputes();

  // `disputeId!` is safe: the query is disabled (and no action can fire) while it is null.
  const query = useQuery({
    queryKey: qk.disputes.detail(disputeId!),
    queryFn: () => disputesApi.get(disputeId!),
    enabled: disputeId !== null,
  });

  const act = useMutation({
    mutationFn: (body: DisputeActionInput) => disputesApi.act(disputeId!, body),
    onSuccess: (_, body) => {
      toast.success(ACTION_SUCCESS[body.action]);
      onActed();
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const can = (a: DisputeActionInput["action"]) =>
    query.data?.allowed.includes(a) ?? false;

  return { query, act, can };
}
