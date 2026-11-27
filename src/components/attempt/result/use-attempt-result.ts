"use client";
import { useQuery } from "@tanstack/react-query";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { DisputeStatus } from "@/shared/schemas/dispute";

// A question with a dispute in one of these states can't be disputed again.
const LIVE_DISPUTE_STATUSES: DisputeStatus[] = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "ESCALATED",
];

/**
 * A published result plus the candidate's disputes for it. Disputes load only
 * once the result itself has loaded (no point asking if the result is hidden).
 */
export function useAttemptResult(attemptId: string) {
  const result = useQuery({
    queryKey: qk.attempts.result(attemptId),
    queryFn: () => attemptsApi.result(attemptId),
  });
  const disputes = useQuery({
    queryKey: qk.disputes.forAttempt(attemptId),
    queryFn: () => attemptsApi.disputes(attemptId),
    enabled: result.isSuccess,
  });

  const canFile = disputes.data?.canFile ?? false;
  /** Question numbers (1-based) that already have a live dispute. */
  const liveDisputeFor = new Set(
    (disputes.data?.disputes ?? [])
      .filter((d) => LIVE_DISPUTE_STATUSES.includes(d.status))
      .map((d) => d.questionNumber),
  );

  return { result, disputes: disputes.data, canFile, liveDisputeFor };
}
