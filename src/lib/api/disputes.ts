import { api, qs } from "./client";
import type {
  DisputeActionInput,
  DisputeDetail,
  DisputeStatus,
  DisputeSummary,
} from "@/shared/schemas/dispute";

export const disputesApi = {
  get: (disputeId: string) => api<DisputeDetail>(`/api/disputes/${disputeId}`),
  act: (disputeId: string, input: DisputeActionInput) =>
    api(`/api/disputes/${disputeId}`, { method: "POST", body: input }),
  /** Admin queue across all exams; empty status means every status. */
  adminQueue: (status: DisputeStatus | "") =>
    api<DisputeSummary[]>(`/api/admin/disputes${qs({ status })}`),
};
