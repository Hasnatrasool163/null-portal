"use client";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { questionsApi, type QuestionListFilters } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Difficulty, QuestionType } from "@/shared/schemas/question";

export const QUESTIONS_PAGE_SIZE = 10;

export type QuestionStatus = "active" | "archived";

/**
 * Question bank filters + the paged list query. Every filter setter jumps back
 * to page 1, since the old page may not exist under the new filter.
 */
export function useQuestionList() {
  const [search, setSearchRaw] = useState("");
  const [q] = useDebounce(search, 300);
  const [topicId, setTopicIdRaw] = useState("");
  const [difficulty, setDifficultyRaw] = useState<Difficulty | "">("");
  const [type, setTypeRaw] = useState<QuestionType | "">("");
  const [status, setStatusRaw] = useState<QuestionStatus>("active");
  const [page, setPage] = useState(1);

  const resetPage =
    <T>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  const filters: QuestionListFilters = {
    q,
    topicId,
    difficulty,
    type,
    status: status === "archived" ? "archived" : undefined,
    page,
    pageSize: QUESTIONS_PAGE_SIZE,
  };

  const list = useQuery({
    queryKey: qk.questions.list(filters),
    queryFn: () => questionsApi.list(filters),
    placeholderData: keepPreviousData,
  });

  return {
    list,
    search,
    setSearch: resetPage(setSearchRaw),
    topicId,
    setTopicId: resetPage(setTopicIdRaw),
    difficulty,
    setDifficulty: resetPage(setDifficultyRaw),
    type,
    setType: resetPage(setTypeRaw),
    status,
    setStatus: resetPage(setStatusRaw),
    page,
    setPage,
    /** Any narrowing filter applied (the status tab doesn't count). */
    filtered: !!(q || topicId || difficulty || type),
  };
}

export type QuestionListState = ReturnType<typeof useQuestionList>;
