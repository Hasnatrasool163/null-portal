import { z } from "zod";
import type { Phase } from "./exam";
import type { QuestionType } from "./question";

export const ATTEMPT_STATUSES = ["IN_PROGRESS", "SUBMITTED"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const GRADING_STATUSES = [
  "NOT_SUBMITTED",
  "AUTO_GRADED",
  "NEEDS_REVIEW",
  "GRADED",
] as const;
export type GradingStatus = (typeof GRADING_STATUSES)[number];

export const SUBMIT_REASONS = ["USER", "TIMEOUT", "EXAMINER"] as const;
export type SubmitReason = (typeof SUBMIT_REASONS)[number];

export const saveAnswerSchema = z.object({
  attemptQuestionId: z.uuid(),
  selectedOptionIds: z.array(z.number().int().positive()).max(8).optional(),
  textAnswer: z.string().max(10_000, "Answer cannot exceed 10,000 characters").nullable().optional(),
  markedForReview: z.boolean().optional(),
  seq: z.number().int().min(1),
});
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;

export type CandidateOptionPublic = {
  id: number;
  body: string;
  position: number;
};

export type AttemptQuestionPublic = {
  id: string;
  position: number;
  type: QuestionType;
  body: string;
  marks: number;
  options: CandidateOptionPublic[];
};

export type SavedAnswer = {
  attemptQuestionId: string;
  selectedOptionIds: number[];
  textAnswer: string | null;
  markedForReview: boolean;
  seq: number;
  syncedLate: boolean;
  savedAt: string;
};

export type AttemptState = {
  id: string;
  examId: string;
  examTitle: string;
  instructions: string;
  isSandbox: boolean;
  status: AttemptStatus;
  gradingStatus: GradingStatus;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  submitReason: SubmitReason | null;
  serverNow: string;
  recoveryWindowSeconds: number;
  scratchpad: string;
  questions: AttemptQuestionPublic[];
  answers: SavedAnswer[];
};

export type AccessStatus =
  | "CAN_START"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UPCOMING"
  | "MISSED";

export type MyExamItem = {
  examId: string;
  title: string;
  instructions: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  phase: Phase;
  questionCount: number;
  totalMarks: number;
  resultsPublished: boolean;
  accessStatus: AccessStatus;
  accessReason: string;
  attemptId: string | null;
  attemptStatus: AttemptStatus | null;
  gradingStatus: GradingStatus | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  totalScore: number | null;
};

export type SubmitResult = {
  attemptId: string;
  status: AttemptStatus;
  gradingStatus: GradingStatus;
  submittedAt: string;
  submitReason: SubmitReason;
  answeredCount: number;
  totalQuestions: number;
};
