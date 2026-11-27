import type {
  AttemptQuestionPublic,
  AttemptState,
} from "@/shared/schemas/attempt";

/** The candidate's in-progress answer to one question, as held in the workspace. */
export type DraftAnswer = {
  selectedOptionIds: number[];
  textAnswer: string;
  markedForReview: boolean;
  seq: number;
};

/** Produces the next answer from the current one; `seq` is bumped by the caller. */
export type DraftUpdater = (prev: DraftAnswer) => Omit<DraftAnswer, "seq">;

export type UpdateDraft = (aqId: string, updater: DraftUpdater) => void;

export const emptyDraft = (): DraftAnswer => ({
  selectedOptionIds: [],
  textAnswer: "",
  markedForReview: false,
  seq: 0,
});

export function isAnswered(a: DraftAnswer | undefined) {
  if (!a) return false;
  return a.selectedOptionIds.length > 0 || a.textAnswer.trim().length > 0;
}

export function buildInitialDrafts(
  attempt: AttemptState,
): Record<string, DraftAnswer> {
  const initial: Record<string, DraftAnswer> = {};
  for (const q of attempt.questions) initial[q.id] = emptyDraft();
  for (const a of attempt.answers) {
    initial[a.attemptQuestionId] = {
      selectedOptionIds: a.selectedOptionIds,
      textAnswer: a.textAnswer ?? "",
      markedForReview: a.markedForReview,
      seq: a.seq,
    };
  }
  return initial;
}

export const toggleFlag: DraftUpdater = (cur) => ({
  selectedOptionIds: cur.selectedOptionIds,
  textAnswer: cur.textAnswer,
  markedForReview: !cur.markedForReview,
});

/** Single choice replaces the selection; multiple choice toggles the option. */
export function toggleOption(
  type: AttemptQuestionPublic["type"],
  optionId: number,
): DraftUpdater {
  return (cur) => {
    if (type === "MCQ_SINGLE") return { ...cur, selectedOptionIds: [optionId] };
    const next = cur.selectedOptionIds.includes(optionId)
      ? cur.selectedOptionIds.filter((x) => x !== optionId)
      : [...cur.selectedOptionIds, optionId];
    return { ...cur, selectedOptionIds: next };
  };
}

export type AnswerCounts = {
  answered: number;
  unanswered: number;
  flagged: number;
};

export function countAnswers(
  questions: AttemptQuestionPublic[],
  drafts: Record<string, DraftAnswer>,
): AnswerCounts {
  let answered = 0;
  let flagged = 0;
  for (const q of questions) {
    const d = drafts[q.id];
    if (isAnswered(d)) answered++;
    if (d?.markedForReview) flagged++;
  }
  return { answered, unanswered: questions.length - answered, flagged };
}
