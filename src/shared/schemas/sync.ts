import { z } from "zod";

export const syncItemSchema = z.object({
  attemptQuestionId: z.uuid(),
  selectedOptionIds: z.array(z.number().int().positive()).max(8).optional(),
  textAnswer: z.string().max(10_000).nullable().optional(),
  markedForReview: z.boolean().optional(),
  seq: z.number().int().min(1),
  /** Monotonic elapsed ms since attempt started, anchored to last server sync. */
  capturedElapsedMs: z.number().min(0).max(86_400_000),
});
export type SyncItemInput = z.infer<typeof syncItemSchema>;

export const syncBatchSchema = z.object({
  items: z.array(syncItemSchema).min(1).max(200),
});
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;

export type SyncItemResult = {
  attemptQuestionId: string;
  seq: number;
  status: "ACCEPTED" | "ACCEPTED_LATE" | "STALE" | "REJECTED";
  reason?: string;
};

export type SyncBatchResponse = {
  serverNow: string;
  attemptStatus: "IN_PROGRESS" | "SUBMITTED";
  accepted: number;
  acceptedLate: number;
  rejected: number;
  results: SyncItemResult[];
};
