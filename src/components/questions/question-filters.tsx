"use client";
import { Archive } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
  type Difficulty,
  type QuestionType,
  type Topic,
} from "@/shared/schemas/question";
import type { QuestionListState } from "@/components/questions/use-question-list";

/** Search, topic/difficulty/type filters and the Active/Archived tabs. */
export function QuestionFilters({
  state,
  topics,
}: {
  state: QuestionListState;
  topics: Topic[] | undefined;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <SearchInput
        label="Search questions"
        value={state.search}
        onChange={state.setSearch}
        phrases={[
          "binary search",
          "TCP handshake",
          "derivative of x²",
          "normalization",
        ]}
      />
      <Select
        className="w-44"
        aria-label="Filter by topic"
        value={state.topicId}
        onChange={(e) => state.setTopicId(e.target.value)}
      >
        <option value="">All topics</option>
        {topics?.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select
        className="w-40"
        aria-label="Filter by difficulty"
        value={state.difficulty}
        onChange={(e) => state.setDifficulty(e.target.value as Difficulty | "")}
      >
        <option value="">All difficulties</option>
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {DIFFICULTY_LABEL[d]}
          </option>
        ))}
      </Select>
      <Select
        className="w-44"
        aria-label="Filter by type"
        value={state.type}
        onChange={(e) => state.setType(e.target.value as QuestionType | "")}
      >
        <option value="">All types</option>
        {QUESTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </Select>
      <div
        role="tablist"
        aria-label="Question status"
        className="bg-muted ml-auto flex h-10 gap-0.5 rounded-md p-1"
      >
        {(["active", "archived"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={state.status === s}
            onClick={() => state.setStatus(s)}
            className={`flex items-center gap-1.5 rounded-[5px] px-3 text-sm font-medium transition-[background-color,color,box-shadow] ${
              state.status === s
                ? "bg-card text-foreground shadow-elev-1"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "archived" && (
              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {s === "active" ? "Active" : "Archived"}
          </button>
        ))}
      </div>
    </div>
  );
}
