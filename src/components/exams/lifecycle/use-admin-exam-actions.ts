"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi, usersApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ExamDetail } from "@/shared/schemas/exam";

/**
 * Admin lifecycle overrides (close/cancel with a reason, owner reassignment)
 * and the examiner list for the reassign picker.
 */
export function useAdminExamActions(examId: string, onDone: () => void) {
  const qc = useQueryClient();
  const done = (updated: ExamDetail, msg: string) => {
    toast.success(msg);
    onDone();
    qc.setQueryData(qk.exams.detail(examId), updated);
    qc.invalidateQueries({ queryKey: qk.exams.all });
    // The Audit tab records these overrides.
    qc.invalidateQueries({ queryKey: qk.audit.all });
  };

  const examiners = useQuery({
    queryKey: qk.users.examiners,
    queryFn: () => usersApi.examiners(),
  });

  const close = useMutation({
    mutationFn: (input: { action: "CLOSE" | "CANCEL"; reason: string }) =>
      examsApi.adminClose(examId, input),
    onSuccess: (u) => done(u, "Exam updated"),
    onError: (e) => toast.error(e.message),
  });

  const reassign = useMutation({
    mutationFn: (ownerId: string) => examsApi.reassignOwner(examId, ownerId),
    onSuccess: (u) => done(u, "Exam reassigned"),
    onError: (e) => toast.error(e.message),
  });

  return { examiners, close, reassign };
}
