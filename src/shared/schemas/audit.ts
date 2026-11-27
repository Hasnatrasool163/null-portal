import { z } from "zod";

export const AUDIT_ACTIONS = [
  "EXAM_PUBLISHED",
  "EXAM_CLOSED",
  "EXAM_CLONED",
  "RESULTS_PUBLISHED",
  "GRADE_CHANGED",
  "LATE_ANSWER_DISCARDED",
  "TIME_EXTENSION_GRANTED",
  "USER_CREATED",
  "ROLE_CHANGED",
  "USER_ACTIVATED",
  "USER_DEACTIVATED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "EXAM_UPDATED",
  "EXAM_QUESTIONS_CHANGED",
  "EXAM_RESCORED",
  "EXAM_OWNER_REASSIGNED",
  "EXAM_CANCELLED",
  "ENROLLMENT_ADDED",
  "ENROLLMENT_REMOVED",
  "ANNOUNCEMENT_POSTED",
  "DISPUTE_FILED",
  "DISPUTE_RESOLVED",
  "DISPUTE_ESCALATED",
  "DISPUTE_DECIDED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  EXAM_PUBLISHED: "Exam published",
  EXAM_CLOSED: "Exam closed",
  EXAM_CLONED: "Exam cloned",
  RESULTS_PUBLISHED: "Results published",
  GRADE_CHANGED: "Grade changed",
  LATE_ANSWER_DISCARDED: "Late answer discarded",
  TIME_EXTENSION_GRANTED: "Extra time granted",
  USER_CREATED: "User created",
  ROLE_CHANGED: "Role changed",
  USER_ACTIVATED: "User activated",
  USER_DEACTIVATED: "User deactivated",
  PASSWORD_CHANGED: "Password changed",
  PASSWORD_RESET: "Password reset by admin",
  EXAM_UPDATED: "Exam edited",
  EXAM_QUESTIONS_CHANGED: "Exam questions changed",
  EXAM_RESCORED: "Answer key rescored",
  EXAM_OWNER_REASSIGNED: "Exam owner reassigned",
  EXAM_CANCELLED: "Exam cancelled",
  ENROLLMENT_ADDED: "Candidates enrolled",
  ENROLLMENT_REMOVED: "Candidate unenrolled",
  ANNOUNCEMENT_POSTED: "Announcement posted",
  DISPUTE_FILED: "Dispute filed",
  DISPUTE_RESOLVED: "Dispute resolved",
  DISPUTE_ESCALATED: "Dispute escalated",
  DISPUTE_DECIDED: "Dispute final decision",
};

export const auditListQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

export type AuditEntry = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: AuditAction;
  examId: string | null;
  examTitle: string | null;
  targetType: string;
  targetId: string | null;
  summary: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type AuditList = {
  items: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
};
