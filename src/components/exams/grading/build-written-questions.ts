import type {
  ExamGradingResponse,
  GradingAnswerItem,
} from "@/shared/schemas/grading";

export type WrittenResponse = { attemptId: string; item: GradingAnswerItem };
export type WrittenQuestion = {
  questionId: string;
  body: string;
  marks: number;
  responses: WrittenResponse[];
};

/** Stable, identity-free order: sorts by a hash of the attempt id, not by name or submit time. */
function blindKey(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Group every submitted written answer by bank question, ordered by the
 * question's average position, with responses in blind (hashed) order.
 */
export function buildWrittenQuestions(
  data: ExamGradingResponse,
): WrittenQuestion[] {
  const map = new Map<string, WrittenQuestion & { posSum: number }>();
  for (const a of data.attempts) {
    if (a.status !== "SUBMITTED") continue;
    for (const item of a.answers) {
      if (item.type !== "WRITTEN") continue;
      let q = map.get(item.questionId);
      if (!q) {
        q = {
          questionId: item.questionId,
          body: item.body,
          marks: item.marks,
          responses: [],
          posSum: 0,
        };
        map.set(item.questionId, q);
      }
      q.responses.push({ attemptId: a.attemptId, item });
      q.posSum += item.position;
    }
  }
  return [...map.values()]
    .sort(
      (x, y) => x.posSum / x.responses.length - y.posSum / y.responses.length,
    )
    .map((q) => ({
      questionId: q.questionId,
      body: q.body,
      marks: q.marks,
      responses: q.responses.sort(
        (r1, r2) => blindKey(r1.attemptId) - blindKey(r2.attemptId),
      ),
    }));
}
