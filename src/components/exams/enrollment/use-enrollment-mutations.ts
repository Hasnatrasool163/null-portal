"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/** Refresh everything that shows enrollment counts after the roster changes. */
export function useInvalidateEnrollment(examId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.exams.enrollments(examId) });
    qc.invalidateQueries({ queryKey: qk.exams.detail(examId) });
    qc.invalidateQueries({ queryKey: qk.exams.all });
  };
}

/** Enroll existing candidate accounts; `onEnrolled` resets the picker UI. */
export function useEnrollCandidates(examId: string, onEnrolled: () => void) {
  const invalidate = useInvalidateEnrollment(examId);
  return useMutation({
    mutationFn: (ids: string[]) => examsApi.enroll(examId, ids),
    onSuccess: (r) => {
      toast.success(`Enrolled ${r.added} candidate(s)`);
      onEnrolled();
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
}

export function useRemoveEnrollment(examId: string) {
  const invalidate = useInvalidateEnrollment(examId);
  return useMutation({
    mutationFn: (candidateId: string) => examsApi.unenroll(examId, candidateId),
    onSuccess: () => {
      toast.success("Candidate removed");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
}
