"use client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { attemptsApi } from "@/lib/api";

/**
 * Save one written answer's mark. Shared by the per-candidate grader and the
 * blind grade-by-question flow; each caller decides what happens on success.
 */
export function useSaveMark({
  attemptId,
  attemptQuestionId,
  onSuccess,
}: {
  attemptId: string;
  attemptQuestionId: string;
  onSuccess: () => void;
}) {
  return useMutation({
    mutationFn: (v: { score: number; feedback: string }) =>
      attemptsApi.grade(attemptId, attemptQuestionId, {
        score: v.score,
        feedback: v.feedback.trim() || undefined,
      }),
    onSuccess: () => onSuccess(),
    onError: (e) => toast.error(e.message),
  });
}
