import type { ExamSummary } from "./schemas/exam";

/**
 * What may be edited, by lifecycle stage (stored status + DB-time phase). Shared by the service
 * layer (which enforces it) and the UI (which only mirrors it).
 *  - FULL       DRAFT, or PUBLISHED with no started attempt
 *  - LIVE       ONGOING (or any started attempt)
 *  - TITLE_ONLY COMPLETED / CLOSED / cancelled
 */
export type EditLevel = "FULL" | "LIVE" | "TITLE_ONLY";

export function editLevel(
  e: Pick<ExamSummary, "status" | "phase" | "startedAttempts">,
): EditLevel {
  if (e.status === "DRAFT") return "FULL";
  if (e.status === "CLOSED" || e.phase === "COMPLETED") return "TITLE_ONLY";
  if (e.phase === "ONGOING" || e.startedAttempts > 0) return "LIVE";
  return "FULL";
}

export const LEVEL_ALLOWED: Record<EditLevel, readonly string[]> = {
  FULL: [
    "title",
    "instructions",
    "startsAt",
    "endsAt",
    "durationMinutes",
    "shuffleQuestions",
    "shuffleOptions",
    "multiScoring",
    "negativeMarking",
    "showAnswers",
    "recoveryWindowSeconds",
  ],
  LIVE: ["title", "instructions", "endsAt"],
  TITLE_ONLY: ["title"],
};
