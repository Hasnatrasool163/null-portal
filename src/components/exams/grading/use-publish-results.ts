"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/** Publish an exam's results; `onDone` runs whether it succeeds or fails. */
export function usePublishResults(examId: string, onDone: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => examsApi.publishResults(examId),
    onSuccess: () => {
      toast.success("Results published to candidates");
      onDone();
      qc.invalidateQueries({ queryKey: qk.grading.exam(examId) });
      qc.invalidateQueries({ queryKey: qk.exams.detail(examId) });
      qc.invalidateQueries({ queryKey: qk.exams.all });
    },
    onError: (e) => {
      onDone();
      toast.error(e.message);
    },
  });
}
