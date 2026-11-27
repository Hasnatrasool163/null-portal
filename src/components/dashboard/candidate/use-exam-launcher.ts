"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import type { MyExamItem } from "@/shared/schemas/attempt";

/**
 * Opens an exam attempt: resumes an in-progress attempt directly, otherwise starts one
 * on the server. Only one launch at a time; `launchingId` stays set until navigation
 * completes so the button keeps its loading state.
 */
export function useExamLauncher(
  exams: MyExamItem[] | undefined,
  refetch: () => unknown,
) {
  const router = useRouter();
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: examsApi.start,
    onSuccess: (attempt) => {
      // Keep button locked in loading state until navigation completes.
      router.push(`/attempts/${attempt.id}`);
    },
    onError: (e) => {
      setLaunchingId(null);
      toast.error(e.message);
      void refetch();
    },
  });

  function launch(examId: string) {
    if (launchingId !== null) return;
    setLaunchingId(examId);
    const existing = exams?.find(
      (e) =>
        e.examId === examId && e.accessStatus === "IN_PROGRESS" && e.attemptId,
    );
    if (existing?.attemptId) {
      router.push(`/attempts/${existing.attemptId}`);
      return;
    }
    start.mutate(examId);
  }

  return { launchingId, launch };
}
