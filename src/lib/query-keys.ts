/**
 * Single source of truth for TanStack Query cache keys.
 *
 * Keys are hierarchical: invalidating a shorter prefix (e.g. `qk.exams.all`)
 * also invalidates every longer key that starts with it (e.g. a filtered list).
 * Always build keys through this factory, never as inline array literals, so a
 * typo can't silently leave a screen showing stale data.
 */
export const qk = {
  exams: {
    all: ["exams"] as const,
    list: (q: string, phase: string) => ["exams", q, phase] as const,
    detail: (examId: string) => ["exam", examId] as const,
    enrollments: (examId: string) => ["exam-enrollments", examId] as const,
    candidateSearch: (examId: string, search: string) =>
      ["candidate-search", examId, search] as const,
    analytics: (examId: string) => ["exam-analytics", examId] as const,
    analyticsSummary: (examId: string) =>
      ["exam-analytics-ai-summary", examId] as const,
    monitor: (examId: string) => ["exam-monitor", examId] as const,
    rescores: (examId: string) => ["exam-rescores", examId] as const,
  },
  grading: {
    all: ["exam-grading"] as const,
    exam: (examId: string) => ["exam-grading", examId] as const,
  },
  myExams: ["my-exams"] as const,

  attempts: {
    detail: (attemptId: string) => ["attempt", attemptId] as const,
    resultAll: ["attempt-result"] as const,
    result: (attemptId: string) => ["attempt-result", attemptId] as const,
    summary: (attemptId: string) => ["attempt-ai-summary", attemptId] as const,
  },

  questions: {
    all: ["questions"] as const,
    list: (filters: Record<string, unknown>) =>
      ["questions", filters] as const,
    picker: (search: string, filters: Record<string, unknown>, page: number) =>
      ["bank-picker", search, filters, page] as const,
    detail: (questionId: string) => ["question", questionId] as const,
    rescoreSource: (questionId: string) =>
      ["rescore-question", questionId] as const,
  },
  topics: ["topics"] as const,

  disputes: {
    all: ["disputes"] as const,
    forAttempt: (attemptId: string) =>
      ["disputes", "attempt", attemptId] as const,
    forExam: (examId: string) => ["disputes", "exam", examId] as const,
    admin: (status: string) => ["disputes", "admin", status] as const,
    detailAll: ["dispute"] as const,
    detail: (disputeId: string) => ["dispute", disputeId] as const,
  },

  users: {
    all: ["admin-users"] as const,
    list: (q: string, role: string, page: number) =>
      ["admin-users", q, role, page] as const,
    examiners: ["admin-examiners"] as const,
  },

  audit: {
    all: ["audit"] as const,
    list: (examId: string | undefined, action: string, page: number) =>
      ["audit", examId ?? "all", action, page] as const,
  },

  notifications: ["notifications"] as const,
  preferences: ["me-preferences"] as const,
} as const;
