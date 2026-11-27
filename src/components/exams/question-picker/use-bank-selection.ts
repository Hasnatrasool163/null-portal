"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { questionsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type {
  Difficulty,
  QuestionListItem,
  QuestionType,
} from "@/shared/schemas/question";
import type { QuestionFilters } from "./question-filter-selects";

export const BANK_PAGE_SIZE = 20;

/**
 * "Choose questions" mode: a filtered, paged view of the bank plus a
 * multi-page selection (kept in a Map so items survive paging).
 */
export function useBankSelection(assignedIds: Set<string>, enabled: boolean) {
  const [search, setSearchState] = useState("");
  const [filters, setFiltersState] = useState<QuestionFilters>({
    topicId: "",
    difficulty: "",
    type: "",
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Map<string, QuestionListItem>>(
    new Map(),
  );

  const bank = useQuery({
    queryKey: qk.questions.picker(search, filters, page),
    queryFn: () =>
      questionsApi.list({
        q: search.trim(),
        topicId: filters.topicId,
        difficulty: filters.difficulty as Difficulty | "",
        type: filters.type as QuestionType | "",
        page,
        pageSize: BANK_PAGE_SIZE,
      }),
    enabled,
    placeholderData: (prev) => prev,
  });

  // Any change to the query narrows the result set, so start from page 1.
  const setSearch = (s: string) => {
    setSearchState(s);
    setPage(1);
  };
  const setFilters = (f: QuestionFilters) => {
    setFiltersState(f);
    setPage(1);
  };

  const pageItems = bank.data?.items ?? [];
  const selectable = pageItems.filter((q) => !assignedIds.has(q.id));
  const allOnPage =
    selectable.length > 0 && selectable.every((q) => selected.has(q.id));

  const toggle = (q: QuestionListItem) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, q);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      selectable.forEach((q) =>
        allOnPage ? next.delete(q.id) : next.set(q.id, q),
      );
      return next;
    });
  const clear = () => setSelected(new Map());

  return {
    search,
    setSearch,
    filters,
    setFilters,
    page,
    setPage,
    bank,
    pageItems,
    selectable,
    allOnPage,
    selected,
    toggle,
    togglePage,
    clear,
  };
}

export type BankSelection = ReturnType<typeof useBankSelection>;
