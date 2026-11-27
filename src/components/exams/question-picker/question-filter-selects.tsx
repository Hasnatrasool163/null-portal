"use client";
import { Select } from "@/components/ui/select";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
} from "@/shared/schemas/question";

/** Topic / difficulty / type filter values; "" means "any". */
export type QuestionFilters = {
  topicId: string;
  difficulty: string;
  type: string;
};

/** The three bank filter dropdowns, shared by browse mode and each draw rule. */
export function QuestionFilterSelects({
  value,
  onChange,
  topics,
  compact,
}: {
  value: QuestionFilters;
  onChange: (f: QuestionFilters) => void;
  topics: { id: string; name: string }[];
  compact?: boolean;
}) {
  const cls = compact ? "h-9" : undefined;
  return (
    <>
      <Select
        aria-label="Topic"
        className={cls}
        value={value.topicId}
        onChange={(e) => onChange({ ...value, topicId: e.target.value })}
      >
        <option value="">Any topic</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Difficulty"
        className={cls}
        value={value.difficulty}
        onChange={(e) => onChange({ ...value, difficulty: e.target.value })}
      >
        <option value="">Any difficulty</option>
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {DIFFICULTY_LABEL[d]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Question type"
        className={cls}
        value={value.type}
        onChange={(e) => onChange({ ...value, type: e.target.value })}
      >
        <option value="">Any type</option>
        {QUESTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </Select>
    </>
  );
}
