import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "EXAM_PUBLISHED",
  "EXAM_ENROLLED",
  "EXAM_CLOSING_SOON",
  "RESULTS_PUBLISHED",
  "EXAM_CANCELLED",
  "GRADING_PENDING",
  "DISPUTE_FILED",
  "DISPUTE_UPDATED",
  "DISPUTE_ESCALATED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationList = { unread: number; items: NotificationItem[] };

/** Omit ids to mark everything read. */
export const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;
