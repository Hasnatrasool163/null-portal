"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { QuestionInput } from "@/shared/schemas/question";

/** The question being edited: an id, "new" for the create form, or null when closed. */
export type EditingQuestion = string | "new" | null;

/**
 * Write operations on the question bank. Each one refreshes the list and the
 * topics (topic counts change with every question write).
 */
export function useQuestionMutations({
  editing,
  onSaved,
  onArchived,
  onDuplicated,
}: {
  editing: EditingQuestion;
  onSaved: () => void;
  onArchived: () => void;
  onDuplicated: (copyId: string) => void;
}) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.questions.all });
    qc.invalidateQueries({ queryKey: qk.topics });
  };

  const save = useMutation({
    mutationFn: (v: QuestionInput) =>
      editing && editing !== "new"
        ? questionsApi.update(editing, v)
        : questionsApi.create(v),
    onSuccess: () => {
      toast.success(editing === "new" ? "Question created" : "Question saved");
      onSaved();
      refresh();
    },
  });
  const archive = useMutation({
    mutationFn: questionsApi.archive,
    onSuccess: () => {
      toast.success("Question archived");
      onArchived();
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const restore = useMutation({
    mutationFn: questionsApi.restore,
    onSuccess: () => {
      toast.success("Question restored to your bank");
      refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const duplicate = useMutation({
    mutationFn: questionsApi.duplicate,
    onSuccess: (copy) => {
      toast.success("Duplicated. Edit the copy below.");
      refresh();
      onDuplicated(copy.id);
    },
    onError: (e) => toast.error(e.message),
  });

  return { save, archive, restore, duplicate };
}
