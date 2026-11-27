"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ExamDetail, ExamPatch, ExamValues } from "@/shared/schemas/exam";

/**
 * Examiner-side exam mutations for the detail page: preview (sandbox),
 * duplicate, settings update, publish and close.
 * `onConfirmSettled` closes the publish/close confirmation dialog.
 */
export function useExamActions(examId: string, onConfirmSettled: () => void) {
  const router = useRouter();
  const qc = useQueryClient();

  const applyUpdate = (updated: ExamDetail) => {
    qc.setQueryData(qk.exams.detail(examId), updated);
    qc.invalidateQueries({ queryKey: qk.exams.all });
  };

  const sandbox = useMutation({
    mutationFn: (reset: boolean) => examsApi.startSandbox(examId, reset),
    onSuccess: (r) => router.push(`/attempts/${r.attemptId}`),
    onError: (e) => toast.error(e.message),
  });

  const clone = useMutation({
    mutationFn: () => examsApi.clone(examId),
    onSuccess: (copy) => {
      toast.success(
        copy.skippedArchived > 0
          ? `Draft copy created. ${copy.skippedArchived} archived question(s) were left out.`
          : "Draft copy created. Review the schedule, then publish.",
      );
      qc.invalidateQueries({ queryKey: qk.exams.all });
      router.push(`/exams/${copy.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: (v: ExamValues | ExamPatch) => examsApi.update(examId, v),
    onSuccess: (updated) => {
      toast.success("Exam updated");
      applyUpdate(updated);
    },
    onError: () => {
      // A stale updatedAt (409) means someone else changed the exam: reload it.
      // The form itself shows the error message.
      qc.invalidateQueries({ queryKey: qk.exams.detail(examId) });
    },
  });

  const publish = useMutation({
    mutationFn: () => examsApi.publish(examId),
    onSuccess: (updated) => {
      toast.success("Exam published");
      onConfirmSettled();
      applyUpdate(updated);
      qc.invalidateQueries({ queryKey: qk.questions.all });
    },
    onError: (e) => {
      onConfirmSettled();
      toast.error(e.message);
    },
  });

  const close = useMutation({
    mutationFn: () => examsApi.close(examId),
    onSuccess: (updated) => {
      toast.success("Exam closed");
      onConfirmSettled();
      applyUpdate(updated);
    },
    onError: (e) => {
      onConfirmSettled();
      toast.error(e.message);
    },
  });

  return { sandbox, clone, update, publish, close };
}
