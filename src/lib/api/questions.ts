import { api, qs } from "./client";
import type {
  Difficulty,
  DrawRequest,
  ImportPayload,
  ImportPreview,
  QuestionDetail,
  QuestionInput,
  QuestionList,
  QuestionListItem,
  QuestionType,
  Topic,
} from "@/shared/schemas/question";

export type QuestionListFilters = {
  q?: string;
  topicId?: string;
  difficulty?: Difficulty | "";
  type?: QuestionType | "";
  /** Omit for active questions; `archived` lists retired ones for restore. */
  status?: "archived";
  page: number;
  pageSize: number;
};

export type DrawResult = {
  items: QuestionListItem[];
  results: { wanted: number; got: number }[];
};

/** Question bank CRUD, random draws and bulk import. */
export const questionsApi = {
  list: (filters: QuestionListFilters) =>
    api<QuestionList>(`/api/questions${qs(filters)}`),
  get: (questionId: string) =>
    api<QuestionDetail>(`/api/questions/${questionId}`),
  create: (input: QuestionInput) =>
    api("/api/questions", { method: "POST", body: input }),
  update: (questionId: string, input: QuestionInput) =>
    api(`/api/questions/${questionId}`, { method: "PATCH", body: input }),
  archive: (questionId: string) =>
    api(`/api/questions/${questionId}`, { method: "DELETE" }),
  restore: (questionId: string) =>
    api(`/api/questions/${questionId}/restore`, { method: "POST" }),
  duplicate: (questionId: string) =>
    api<QuestionDetail>(`/api/questions/${questionId}/duplicate`, {
      method: "POST",
    }),
  draw: (request: DrawRequest) =>
    api<DrawResult>("/api/questions/draw", { method: "POST", body: request }),
  validateImport: (payload: ImportPayload) =>
    api<ImportPreview>("/api/questions/import/validate", {
      method: "POST",
      body: payload,
    }),
  commitImport: (payload: ImportPayload) =>
    api<{ imported: number; skipped: number }>("/api/questions/import/commit", {
      method: "POST",
      body: payload,
    }),
};

export const topicsApi = {
  list: () => api<Topic[]>("/api/topics"),
  create: (name: string) =>
    api("/api/topics", { method: "POST", body: { name } }),
  rename: (topicId: string, name: string) =>
    api(`/api/topics/${topicId}`, { method: "PATCH", body: { name } }),
  remove: (topicId: string) =>
    api(`/api/topics/${topicId}`, { method: "DELETE" }),
};
