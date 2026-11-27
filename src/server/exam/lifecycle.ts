import "server-only";
import { Errors } from "../http";
import type { ExamSummary } from "@/shared/schemas/exam";
import { editLevel, LEVEL_ALLOWED, type EditLevel } from "@/shared/exam-lifecycle";

export { editLevel, LEVEL_ALLOWED, type EditLevel };

export function levelReason(e: ExamSummary, level: EditLevel): string {
  if (level === "LIVE") {
    return "This exam is ongoing: only the title, instructions (for new starts) and a later window end can be changed.";
  }
  if (e.status === "CLOSED") {
    return `This exam is closed${e.cancelled ? " (cancelled)" : ""}: only the title can be changed. Use an answer-key rescore to correct scores.`;
  }
  return "This exam has completed: only the title can be changed. Use an answer-key rescore to correct scores.";
}

/**
 * Optimistic concurrency: a client that sends the updatedAt it last read is rejected with 409
 * if someone changed the exam since. (Omitting it keeps the legacy last-write-wins behaviour.)
 */
export function assertFresh(
  e: ExamSummary,
  updatedAt: string | undefined,
  required: boolean,
) {
  if (updatedAt === undefined) {
    if (required) {
      throw Errors.badRequest("updatedAt is required.", { updatedAt: "Required" });
    }
    return;
  }
  if (Date.parse(updatedAt) !== Date.parse(e.updatedAt)) {
    throw Errors.conflict(
      "This exam was changed by someone else since you opened it. Reload and try again.",
      { updatedAt: "Stale" },
    );
  }
}
