import { z } from "zod";
import type { Difficulty, QuestionType } from "./question";

export const preferencesSchema = z.object({
  fontSize: z.enum(["sm", "md", "lg"]).default("md"),
  theme: z.enum(["light", "dark", "high-contrast"]).default("light"),
  palettePosition: z.enum(["side", "bottom"]).default("side"),
  layout: z.enum(["single", "scroll"]).default("single"),
  timerStyle: z.enum(["always", "subtle"]).default("always"),
});
export type WorkspacePreferences = z.infer<typeof preferencesSchema>;
export const preferencesPatchSchema = preferencesSchema.partial();

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  fontSize: "md",
  theme: "light",
  palettePosition: "side",
  layout: "single",
  timerStyle: "always",
};

export const scratchpadSchema = z.object({
  scratchpad: z.string().max(20_000, "Scratchpad limit is 20,000 characters"),
});

export const sandboxStartSchema = z.object({
  reset: z.boolean().optional(),
});

export type QuestionAnalyticsItem = {
  questionId: string;
  position: number;
  body: string;
  topicName: string;
  type: QuestionType;
  declaredDifficulty: Difficulty;
  observedDifficulty: Difficulty | null;
  difficultyMismatch: boolean;
  marks: number;
  attempts: number;
  skipRate: number;
  percentCorrect: number;
  avgScorePct: number;
  mostCommonWrong: string | null;
  optionDistribution: {
    optionId: number;
    body: string;
    isCorrect: boolean;
    count: number;
    percent: number;
  }[];
};

export type ExamAnalyticsResponse = {
  examId: string;
  examTitle: string;
  submittedAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  totalMarks: number;
  questions: QuestionAnalyticsItem[];
};

export type VerificationPublic = {
  code: string;
  status: "VALID" | "REVOKED" | "SUPERSEDED";
  examTitle: string;
  maskedCandidateName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  scoreBand: string;
  issuedAt: string;
};
