"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ExamDetail } from "@/shared/schemas/exam";

/** Submit an audited answer-key correction; `onDone` resets the form. */
export function useRescore(exam: ExamDetail, onDone: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      questionId: string;
      correctOptionIds: number[];
      reason: string;
    }) => examsApi.rescore(exam.id, { ...input, updatedAt: exam.updatedAt }),
    onSuccess: (r) => {
      toast.success(
        `Rescored: ${r.answersChanged} answer(s) across ${r.attemptsAffected} attempt(s)`,
      );
      onDone();
      qc.invalidateQueries({ queryKey: qk.exams.detail(exam.id) });
      qc.invalidateQueries({ queryKey: qk.exams.rescores(exam.id) });
    },
    onError: (e) => {
      toast.error(e.message);
      // Likely a stale updatedAt: reload the exam so a retry uses the fresh token.
      qc.invalidateQueries({ queryKey: qk.exams.detail(exam.id) });
    },
  });
}
