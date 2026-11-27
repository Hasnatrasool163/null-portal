"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { examsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { ExamDetail } from "@/shared/schemas/exam";
import type { QuestionListItem } from "@/shared/schemas/question";

export type QuestionSetItem = Pick<
  ExamDetail["questions"][number],
  "questionId" | "body" | "topicName" | "type" | "difficulty" | "marks"
>;

/**
 * Local, unsaved edits to an exam's question set (order, marks, add/remove)
 * plus the save mutation. Nothing reaches the server until `save` runs.
 */
export function useQuestionSet(exam: ExamDetail) {
  const qc = useQueryClient();
  const [items, setItems] = useState<QuestionSetItem[]>(
    exam.questions.map((q) => ({
      questionId: q.questionId,
      body: q.body,
      topicName: q.topicName,
      type: q.type,
      difficulty: q.difficulty,
      marks: q.marks,
    })),
  );
  const [dirty, setDirty] = useState(false);

  const edit = (fn: (prev: QuestionSetItem[]) => QuestionSetItem[]) => {
    setItems(fn);
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () =>
      examsApi.setQuestions(exam.id, {
        items: items.map((x) => ({
          questionId: x.questionId,
          marks: x.marks,
        })),
        updatedAt: exam.updatedAt,
      }),
    onSuccess: (updated) => {
      toast.success("Question set saved");
      setDirty(false);
      qc.setQueryData(qk.exams.detail(exam.id), updated);
      qc.invalidateQueries({ queryKey: qk.exams.all });
    },
    onError: (e) => toast.error(e.message),
  });

  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    edit(() => copy);
  }

  const setMarks = (idx: number, value: number) =>
    edit((prev) =>
      prev.map((p, k) =>
        k === idx ? { ...p, marks: Number.isNaN(value) ? 0 : value } : p,
      ),
    );

  const remove = (idx: number) =>
    edit((prev) => prev.filter((_, k) => k !== idx));

  const add = (picked: QuestionListItem[]) =>
    edit((prev) => [
      ...prev,
      ...picked
        .filter((q) => !prev.some((x) => x.questionId === q.id))
        .map((q) => ({
          questionId: q.id,
          body: q.body,
          topicName: q.topicName,
          type: q.type,
          difficulty: q.difficulty,
          marks: q.defaultMarks,
        })),
    ]);

  return {
    items,
    dirty,
    assignedIds: new Set(items.map((x) => x.questionId)),
    totalMarks: items.reduce((s, x) => s + (Number(x.marks) || 0), 0),
    move,
    setMarks,
    remove,
    add,
    save,
  };
}
