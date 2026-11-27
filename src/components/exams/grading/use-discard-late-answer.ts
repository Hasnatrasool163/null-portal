"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/** Drop an answer that synced during the recovery window and recompute the score. */
export function useDiscardLateAnswer(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { attemptId: string; answerId: string }) =>
      attemptsApi.discardLateAnswer(v.attemptId, v.answerId),
    onSuccess: () => {
      toast.success("Late-synced answer discarded and score recomputed");
      qc.invalidateQueries({ queryKey: qk.grading.exam(examId) });
    },
    onError: (e) => toast.error(e.message),
  });
}
