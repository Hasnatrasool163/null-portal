import { api } from "./client";
import type { AttemptState, SubmitResult } from "@/shared/schemas/attempt";
import type { SyncBatchResponse, SyncItemInput } from "@/shared/schemas/sync";
import type {
  HeartbeatResponse,
  IncidentType,
} from "@/shared/schemas/monitoring";
import type { CandidateResultView } from "@/shared/schemas/grading";
import type {
  AttemptDisputes,
  CreateDisputeInput,
} from "@/shared/schemas/dispute";
import type { CandidateSummaryResponse } from "@/shared/schemas/ai-summary";

const base = (attemptId: string) => `/api/attempts/${attemptId}`;

/** Candidate-side attempt lifecycle plus examiner actions scoped to one attempt. */
export const attemptsApi = {
  get: (attemptId: string) => api<AttemptState>(base(attemptId)),

  submit: (attemptId: string) =>
    api<SubmitResult>(`${base(attemptId)}/submit`, { method: "POST" }),

  sync: (attemptId: string, items: SyncItemInput[]) =>
    api<SyncBatchResponse>(`${base(attemptId)}/sync`, {
      method: "POST",
      body: { items },
    }),

  heartbeat: (attemptId: string) =>
    api<HeartbeatResponse>(`${base(attemptId)}/heartbeat`, { method: "POST" }),

  reportIncident: (
    attemptId: string,
    type: IncidentType,
    details?: Record<string, unknown>,
  ) =>
    api(`${base(attemptId)}/incidents`, {
      method: "POST",
      body: details ? { type, details } : { type },
    }),

  saveScratchpad: (attemptId: string, scratchpad: string) =>
    api(`${base(attemptId)}/scratchpad`, {
      method: "PUT",
      body: { scratchpad },
    }),

  /** Download link (not a JSON call): the candidate's result report. */
  reportPdfUrl: (attemptId: string) => `${base(attemptId)}/report.pdf`,

  result: (attemptId: string) =>
    api<CandidateResultView>(`${base(attemptId)}/result`),

  disputes: (attemptId: string) =>
    api<AttemptDisputes>(`${base(attemptId)}/disputes`),

  fileDispute: (attemptId: string, input: CreateDisputeInput) =>
    api(`${base(attemptId)}/disputes`, { method: "POST", body: input }),

  summary: (attemptId: string) =>
    api<CandidateSummaryResponse | null>(`${base(attemptId)}/summary`),

  generateSummary: (attemptId: string, refresh: boolean) =>
    api<CandidateSummaryResponse>(`${base(attemptId)}/summary`, {
      method: "POST",
      body: { refresh },
    }),

  grade: (
    attemptId: string,
    attemptQuestionId: string,
    input: { score: number; feedback?: string },
  ) =>
    api(`${base(attemptId)}/grade/${attemptQuestionId}`, {
      method: "PUT",
      body: input,
    }),

  discardLateAnswer: (attemptId: string, answerId: string) =>
    api(`${base(attemptId)}/discard-late/${answerId}`, { method: "POST" }),

  grantExtension: (
    attemptId: string,
    input: { minutes: number; reason: string },
  ) => api(`${base(attemptId)}/extensions`, { method: "POST", body: input }),
};
