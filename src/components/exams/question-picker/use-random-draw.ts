"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { questionsApi, type DrawResult } from "@/lib/api";
import type { Difficulty, QuestionType } from "@/shared/schemas/question";
import type { QuestionFilters } from "./question-filter-selects";

export type DrawRule = QuestionFilters & { key: number; count: string };

/**
 * "Random by rules" mode: an editable blueprint ("5 easy from Topic A + 3 hard")
 * drawn server-side, never re-picking questions already in the exam.
 */
export function useRandomDraw(assignedIds: Set<string>) {
  const [rules, setRules] = useState<DrawRule[]>([
    { key: 1, count: "5", topicId: "", difficulty: "", type: "" },
  ]);
  const [drawn, setDrawn] = useState<DrawResult | null>(null);

  const ruleErrors = rules.map((r) => {
    const n = Number(r.count);
    return !Number.isInteger(n) || n < 1 || n > 50 ? "1–50" : "";
  });
  const rulesValid = ruleErrors.every((e) => !e);
  const wanted = rules.reduce((s, r) => s + (Number(r.count) || 0), 0);

  const draw = useMutation({
    mutationFn: () =>
      questionsApi.draw({
        rules: rules.map((r) => ({
          count: Number(r.count),
          topicId: r.topicId || undefined,
          difficulty: (r.difficulty || undefined) as Difficulty | undefined,
          type: (r.type || undefined) as QuestionType | undefined,
        })),
        excludeIds: [...assignedIds],
      }),
    onSuccess: setDrawn,
    onError: (e) => toast.error(e.message),
  });

  const updateRule = (key: number, patch: Partial<DrawRule>) =>
    setRules((prev) =>
      prev.map((x) => (x.key === key ? { ...x, ...patch } : x)),
    );
  const removeRule = (key: number) =>
    setRules((prev) => prev.filter((x) => x.key !== key));
  const addRule = () =>
    setRules((prev) => [
      ...prev,
      { key: Date.now(), count: "3", topicId: "", difficulty: "", type: "" },
    ]);

  return {
    rules,
    ruleErrors,
    rulesValid,
    wanted,
    updateRule,
    removeRule,
    addRule,
    drawn,
    setDrawn,
    draw,
  };
}

export type RandomDraw = ReturnType<typeof useRandomDraw>;
