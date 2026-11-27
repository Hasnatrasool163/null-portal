import "server-only";
import type { MultiScoring } from "@/shared/schemas/exam";
import type { QuestionType } from "@/shared/schemas/question";

export type SnapshotOption = {
  id: number;
  body: string;
  isCorrect: boolean;
  position: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Pure auto-grading function operating strictly on the immutable snapshot.
 * Returns null for WRITTEN questions (graded manually only).
 */
export function scoreObjectiveAnswer(params: {
  type: QuestionType;
  marks: number;
  options: SnapshotOption[];
  selectedOptionIds: number[];
  multiScoring: MultiScoring;
  negativeMarking: number;
}): number | null {
  const { type, marks, options, selectedOptionIds, multiScoring, negativeMarking } =
    params;
  if (type === "WRITTEN") return null;

  const picked = [...new Set(selectedOptionIds)];
  if (picked.length === 0) return 0; // Unanswered always scores 0 (no negative marking).

  const correctIds = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));

  if (type === "MCQ_SINGLE") {
    if (picked.length === 1 && correctIds.has(picked[0])) return round2(marks);
    return negativeMarking > 0 ? round2(-marks * negativeMarking) : 0;
  }

  // MCQ_MULTI
  const totalCorrect = correctIds.size;
  if (totalCorrect === 0) return 0;
  let correctPicked = 0;
  let wrongPicked = 0;
  for (const id of picked) {
    if (correctIds.has(id)) correctPicked++;
    else wrongPicked++;
  }
  if (multiScoring === "ALL_OR_NOTHING") {
    return correctPicked === totalCorrect && wrongPicked === 0
      ? round2(marks)
      : 0;
  }
  const ratio = Math.max(0, (correctPicked - wrongPicked) / totalCorrect);
  return round2(marks * ratio);
}
