"use client";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";

/** Invalidate everything a dispute change can affect (lists, detail, the result score). */
export function useRefreshDisputes() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.disputes.all });
    qc.invalidateQueries({ queryKey: qk.disputes.detailAll });
    qc.invalidateQueries({ queryKey: qk.attempts.resultAll });
    qc.invalidateQueries({ queryKey: qk.grading.all });
    qc.invalidateQueries({ queryKey: qk.notifications });
  };
}
