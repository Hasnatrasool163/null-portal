"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import { useInvalidateEnrollment } from "@/components/exams/enrollment/use-enrollment-mutations";
import type {
  CandidateImportPreview,
  CandidateImportResult,
} from "@/shared/schemas/exam";

/**
 * CSV candidate import flow: read file → server-side validation preview →
 * commit. `onFinished` closes the dialog when there are no new credentials to show.
 */
export function useCandidateImport(examId: string, onFinished: () => void) {
  const invalidate = useInvalidateEnrollment(examId);
  const [content, setContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CandidateImportPreview | null>(null);
  const [result, setResult] = useState<CandidateImportResult | null>(null);

  function reset() {
    setContent(null);
    setFileName("");
    setPreview(null);
    setResult(null);
  }

  const validate = useMutation({
    mutationFn: (c: string) => examsApi.validateCandidateImport(examId, c),
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null);
      toast.error(e.message);
    },
  });

  const commit = useMutation({
    mutationFn: (c: string) => examsApi.commitCandidateImport(examId, c),
    onSuccess: (r) => {
      toast.success(`Enrolled ${r.enrolled} candidate(s)`);
      invalidate();
      if (r.created.length > 0) {
        setResult(r);
      } else {
        reset();
        onFinished();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  async function selectFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setContent(text);
    setFileName(file.name);
    setPreview(null);
    setResult(null);
    validate.mutate(text);
  }

  return {
    content,
    fileName,
    preview,
    result,
    reset,
    selectFile,
    validating: validate.isPending,
    commit,
  };
}
