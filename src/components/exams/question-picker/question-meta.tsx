import {
  DIFFICULTY_LABEL,
  TYPE_LABEL,
  type QuestionListItem,
} from "@/shared/schemas/question";

/** "Topic · Type · Difficulty · N marks" line under a question in the picker. */
export function QuestionMeta({ q }: { q: QuestionListItem }) {
  return (
    <p className="text-muted-foreground mt-0.5 text-xs">
      {q.topicName} · {TYPE_LABEL[q.type]} · {DIFFICULTY_LABEL[q.difficulty]} ·{" "}
      {q.defaultMarks} {q.defaultMarks === 1 ? "mark" : "marks"}
    </p>
  );
}
