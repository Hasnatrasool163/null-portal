import { z } from "zod";
import type { AttemptStatus, GradingStatus, SubmitReason } from "./attempt";
import type { QuestionType } from "./question";

export const gradeAnswerSchema = z.object({
  score: z
    .number({ error: "Enter a mark" })
    .min(0, "Mark cannot be negative")
    .refine((v) => Number.isInteger(v * 2), "Use 0.5 mark steps"),
  feedback: z.string().trim().max(2000, "Feedback is too long").optional(),
});
export type GradeAnswerInput = z.infer<typeof gradeAnswerSchema>;

export type GradingOption = {
  id: number;
  body: string;
  isCorrect: boolean;
  position: number;
};

export type GradingAnswerItem = {
  attemptQuestionId: string;
  position: number;
  type: QuestionType;
  body: string;
  marks: number;
  options: GradingOption[];
  selectedOptionIds: number[];
  textAnswer: string | null;
  score: number | null;
  feedback: string | null;
  syncedLate: boolean;
  answerId: string | null;
};

export type GradingAttemptSummary = {
  attemptId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: AttemptStatus;
  gradingStatus: GradingStatus;
  startedAt: string;
  deadlineAt: string;
  submittedAt: string | null;
  submitReason: SubmitReason | null;
  totalScore: number | null;
  rawScoreSum: number | null;
  totalMarks: number;
  pendingWrittenCount: number;
  lateSyncCount: number;
  answers: GradingAnswerItem[];
};

export type ExamGradingResponse = {
  examId: string;
  examTitle: string;
  resultsPublishedAt: string | null;
  canPublishResults: boolean;
  publishBlockedReason: string | null;
  attempts: GradingAttemptSummary[];
};

export type CandidateResultOption = {
  id: number;
  body: string;
  position: number;
  isCorrect?: boolean;
};

export type CandidateResultQuestion = {
  attemptQuestionId: string;
  position: number;
  type: QuestionType;
  body: string;
  marks: number;
  options: CandidateResultOption[];
  selectedOptionIds: number[];
  textAnswer: string | null;
  score: number | null;
  feedback: string | null;
};

export type CandidateResultView = {
  attemptId: string;
  examId: string;
  examTitle: string;
  candidateName: string;
  submittedAt: string;
  submitReason: SubmitReason | null;
  gradingStatus: GradingStatus;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  showAnswers: boolean;
  resultsPublishedAt: string;
  questions: CandidateResultQuestion[];
};
