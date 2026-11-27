import { api, qs } from "./client";
import type {
  AdminCloseInput,
  CandidateImportPreview,
  CandidateImportResult,
  CandidateOption,
  EnrolledCandidate,
  ExamDetail,
  ExamPatch,
  ExamQuestionsInput,
  ExamSummary,
  ExamValues,
  Phase,
  RescoreInput,
} from "@/shared/schemas/exam";
import type { AttemptState, MyExamItem } from "@/shared/schemas/attempt";
import type { ExamGradingResponse } from "@/shared/schemas/grading";
import type { MonitorResponse } from "@/shared/schemas/monitoring";
import type { ExamAnalyticsResponse } from "@/shared/schemas/secondary";
import type { ExamAnalyticsSummaryResponse } from "@/shared/schemas/ai-summary";
import type { DisputeSummary } from "@/shared/schemas/dispute";

/** One audited answer-key correction on a completed exam. */
export type RescoreRun = {
  id: string;
  questionId: string;
  oldCorrectIds: number[];
  newCorrectIds: number[];
  reason: string;
  attemptsAffected: number;
  rescoredBy: string | null;
  createdAt: string;
  /** Every answer this run re-marked. */
  changes: {
    attemptId: string;
    oldScore: number | null;
    newScore: number | null;
    oldTotalScore: number | null;
    newTotalScore: number | null;
  }[];
};

const base = (examId: string) => `/api/exams/${examId}`;

/** Exam authoring, enrollment, monitoring, grading and results. */
export const examsApi = {
  list: (filters: { q?: string; phase?: Phase | "" }) =>
    api<ExamSummary[]>(`/api/exams${qs(filters)}`),
  get: (examId: string) => api<ExamDetail>(base(examId)),
  create: (values: ExamValues) =>
    api<ExamDetail>("/api/exams", { method: "POST", body: values }),
  update: (examId: string, patch: ExamValues | ExamPatch) =>
    api<ExamDetail>(base(examId), { method: "PATCH", body: patch }),
  setQuestions: (examId: string, input: ExamQuestionsInput) =>
    api<ExamDetail>(`${base(examId)}/questions`, { method: "PUT", body: input }),
  publish: (examId: string) =>
    api<ExamDetail>(`${base(examId)}/publish`, { method: "POST" }),
  close: (examId: string) =>
    api<ExamDetail>(`${base(examId)}/close`, { method: "POST" }),
  clone: (examId: string) =>
    api<ExamDetail & { skippedArchived: number }>(`${base(examId)}/clone`, {
      method: "POST",
    }),
  startSandbox: (examId: string, reset: boolean) =>
    api<{ attemptId: string }>(`${base(examId)}/sandbox`, {
      method: "POST",
      body: { reset },
    }),

  // Candidate side
  mine: () => api<MyExamItem[]>("/api/my/exams"),
  start: (examId: string) =>
    api<AttemptState>(`${base(examId)}/start`, { method: "POST" }),

  // Enrollment
  enrollments: (examId: string) =>
    api<EnrolledCandidate[]>(`${base(examId)}/enrollments`),
  searchCandidates: (examId: string, q: string) =>
    api<CandidateOption[]>(`/api/candidates${qs({ examId, q: q.trim() })}`),
  enroll: (examId: string, candidateIds: string[]) =>
    api<{ added: number }>(`${base(examId)}/enrollments`, {
      method: "POST",
      body: { candidateIds },
    }),
  unenroll: (examId: string, candidateId: string) =>
    api(`${base(examId)}/enrollments/${candidateId}`, { method: "DELETE" }),
  validateCandidateImport: (examId: string, content: string) =>
    api<CandidateImportPreview>(`${base(examId)}/candidates/import/validate`, {
      method: "POST",
      body: { content },
    }),
  commitCandidateImport: (examId: string, content: string) =>
    api<CandidateImportResult>(`${base(examId)}/candidates/import/commit`, {
      method: "POST",
      body: { content },
    }),

  // Live monitoring
  monitor: (examId: string) => api<MonitorResponse>(`${base(examId)}/monitor`),
  announce: (examId: string, message: string) =>
    api(`${base(examId)}/announcements`, { method: "POST", body: { message } }),

  // Grading & results
  grading: (examId: string) =>
    api<ExamGradingResponse>(`${base(examId)}/grading`),
  publishResults: (examId: string) =>
    api(`${base(examId)}/results/publish`, { method: "POST" }),
  rescores: (examId: string) => api<RescoreRun[]>(`${base(examId)}/rescore`),
  rescore: (examId: string, input: RescoreInput) =>
    api<{ answersChanged: number; attemptsAffected: number }>(
      `${base(examId)}/rescore`,
      { method: "POST", body: input },
    ),
  disputes: (examId: string) =>
    api<DisputeSummary[]>(`${base(examId)}/disputes`),
  /** Download link (not a JSON call): results spreadsheet. */
  resultsCsvUrl: (examId: string) => `${base(examId)}/results.csv`,
  /** Download link (not a JSON call): cohort summary report. */
  reportPdfUrl: (examId: string) => `${base(examId)}/report.pdf`,

  // Analytics
  analytics: (examId: string) =>
    api<ExamAnalyticsResponse>(`${base(examId)}/analytics`),
  analyticsSummary: (examId: string) =>
    api<ExamAnalyticsSummaryResponse | null>(
      `${base(examId)}/analytics/summary`,
    ),
  generateAnalyticsSummary: (examId: string, refresh: boolean) =>
    api<ExamAnalyticsSummaryResponse>(`${base(examId)}/analytics/summary`, {
      method: "POST",
      body: { refresh },
    }),

  // Admin-only lifecycle overrides
  adminClose: (examId: string, input: AdminCloseInput) =>
    api<ExamDetail>(`/api/admin/exams/${examId}/close`, {
      method: "POST",
      body: input,
    }),
  reassignOwner: (examId: string, ownerId: string) =>
    api<ExamDetail>(`/api/admin/exams/${examId}/owner`, {
      method: "POST",
      body: { ownerId },
    }),
};
