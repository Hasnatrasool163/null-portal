"use client";
import { useCallback, useMemo, useState } from "react";
import {
  buildWrittenQuestions,
  type WrittenResponse,
} from "@/components/exams/grading/build-written-questions";
import type { ExamGradingResponse } from "@/shared/schemas/grading";

/** Selection, progress and navigation state for blind grade-by-question. */
export function useBlindGrading(data: ExamGradingResponse) {
  const questions = useMemo(() => buildWrittenQuestions(data), [data]);
  const [qId, setQId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  // Marks saved in this session, so "next ungraded" is right before the refetch lands.
  const [savedLocal, setSavedLocal] = useState<Set<string>>(new Set());

  const question = questions.find((q) => q.questionId === qId) ?? questions[0];
  const responses = useMemo(() => question?.responses ?? [], [question]);
  const current = responses[Math.min(idx, Math.max(0, responses.length - 1))];

  const isGraded = useCallback(
    (r: WrittenResponse) =>
      r.item.score !== null || savedLocal.has(r.item.attemptQuestionId),
    [savedLocal],
  );
  const gradedCount = responses.filter(isGraded).length;
  const allWritten = questions.flatMap((q) => q.responses);
  const allGraded = allWritten.filter(isGraded).length;

  const go = useCallback(
    (to: number) => setIdx(Math.max(0, Math.min(responses.length - 1, to))),
    [responses.length],
  );
  const nextUngraded = useCallback(
    (from: number, extraGraded?: string) => {
      for (let k = 1; k <= responses.length; k++) {
        const j = (from + k) % responses.length;
        const r = responses[j];
        if (!isGraded(r) && r.item.attemptQuestionId !== extraGraded) return j;
      }
      return -1;
    },
    [responses, isGraded],
  );

  const selectQuestion = (questionId: string) => {
    setQId(questionId);
    setIdx(0);
  };
  const markSaved = (attemptQuestionId: string) =>
    setSavedLocal((s) => new Set(s).add(attemptQuestionId));

  return {
    questions,
    question,
    responses,
    current,
    idx,
    setIdx,
    selectQuestion,
    isGraded,
    gradedCount,
    allWrittenCount: allWritten.length,
    allGraded,
    go,
    nextUngraded,
    markSaved,
  };
}
