"use client";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionsApi } from "@/lib/api";
import { plural } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { ImportPayload, ImportPreview } from "@/shared/schemas/question";

/**
 * Two-step import: picking a file validates every row server-side (preview),
 * then `commit` imports only the valid rows.
 */
export function useQuestionImport({ onImported }: { onImported: () => void }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  function reset() {
    setPayload(null);
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const validate = useMutation({
    mutationFn: questionsApi.validateImport,
    onSuccess: setPreview,
    onError: (e) => {
      setPreview(null);
      toast.error(e.message);
    },
  });
  const commit = useMutation({
    mutationFn: questionsApi.commitImport,
    onSuccess: (r) => {
      toast.success(`Imported ${plural(r.imported, "question")}`);
      qc.invalidateQueries({ queryKey: qk.questions.all });
      qc.invalidateQueries({ queryKey: qk.topics });
      reset();
      onImported();
    },
    onError: (e) => toast.error(e.message),
  });

  async function selectFile(f: File | undefined) {
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".json")) {
      toast.error("Choose a .csv or .json file.");
      return;
    }
    const p: ImportPayload = {
      format: lower.endsWith(".json") ? "json" : "csv",
      content: await f.text(),
    };
    setPayload(p);
    setFile({ name: f.name, size: f.size });
    setPreview(null);
    validate.mutate(p);
  }

  return {
    inputRef,
    /** Opens the native file picker. */
    browse: () => inputRef.current?.click(),
    payload,
    file,
    preview,
    validate,
    commit,
    selectFile,
    reset,
  };
}
