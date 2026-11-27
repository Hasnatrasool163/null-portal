import { api, qs } from "./client";
import type { AuditAction, AuditList } from "@/shared/schemas/audit";

/** Pre-exam device checks. */
export const systemApi = {
  ping: (ts: number) =>
    api<{ serverNow: string }>(`/api/ping${qs({ ts })}`, { cache: "no-store" }),
  echo: (nonce: string, payload: string) =>
    api<{ nonce: string; receivedBytes: number }>("/api/system-check", {
      method: "POST",
      body: { nonce, payload },
    }),
};

export const auditApi = {
  /** Exam-scoped log when `examId` is given, otherwise the platform-wide admin log. */
  list: ({
    examId,
    ...filters
  }: {
    examId?: string;
    action?: AuditAction | "";
    page: number;
    pageSize: number;
  }) => {
    const path = examId ? `/api/exams/${examId}/audit` : "/api/admin/audit";
    return api<AuditList>(`${path}${qs(filters)}`);
  },
};
