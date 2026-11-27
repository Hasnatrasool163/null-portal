import { z } from "zod";
import type { Role } from "./auth";

/** Days after results are published during which a candidate may file a dispute. */
export const DISPUTE_FILING_DAYS = 7;
/** Days after an examiner's resolution during which the candidate may escalate it. */
export const DISPUTE_ESCALATION_DAYS = 7;
/** Cap per attempt, so the process can't be flooded. */
export const MAX_DISPUTES_PER_ATTEMPT = 5;

export const DISPUTE_CATEGORIES = [
  "GRADING_ERROR",
  "AMBIGUOUS_QUESTION",
  "TECHNICAL_INCIDENT",
  "OTHER",
] as const;
export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<DisputeCategory, string> = {
  GRADING_ERROR: "Grading error",
  AMBIGUOUS_QUESTION: "Ambiguous or incorrect question",
  TECHNICAL_INCIDENT: "Technical incident",
  OTHER: "Other",
};
export const CATEGORY_HINT: Record<DisputeCategory, string> = {
  GRADING_ERROR: "A mark looks wrong for the answer you gave.",
  AMBIGUOUS_QUESTION: "The question or its answer key was unclear or wrong.",
  TECHNICAL_INCIDENT: "A connection, device or platform problem affected your attempt.",
  OTHER: "Anything else about how this result was produced.",
};

export const DISPUTE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "ESCALATED",
  "CLOSED",
  "WITHDRAWN",
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];
export const STATUS_LABEL: Record<DisputeStatus, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved by examiner",
  ESCALATED: "Escalated to admin",
  CLOSED: "Closed",
  WITHDRAWN: "Withdrawn",
};

export const DISPUTE_OUTCOMES = ["UPHELD", "PARTIALLY_UPHELD", "REJECTED"] as const;
export type DisputeOutcome = (typeof DISPUTE_OUTCOMES)[number];
export const OUTCOME_LABEL: Record<DisputeOutcome, string> = {
  UPHELD: "Upheld",
  PARTIALLY_UPHELD: "Partially upheld",
  REJECTED: "Rejected",
};

export type DisputeEventKind =
  | "FILED"
  | "COMMENT"
  | "REVIEW_STARTED"
  | "RESOLVED"
  | "ACCEPTED"
  | "ESCALATED"
  | "DECIDED"
  | "WITHDRAWN"
  | "SCORE_CHANGED";

const text = (min: number, what: string) =>
  z
    .string()
    .trim()
    .min(min, `${what} must be at least ${min} characters`)
    .max(2000, `${what} is too long`);

export const createDisputeSchema = z.object({
  attemptQuestionId: z.uuid().optional(),
  category: z.enum(DISPUTE_CATEGORIES),
  reason: text(20, "Explanation"),
});
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

/** Optional mark correction for a WRITTEN question, made as part of a decision. */
const newScore = z
  .number()
  .min(0)
  .refine((v) => Number.isInteger(v * 2), "Marks go in steps of 0.5")
  .optional();

export const disputeActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("COMMENT"), message: text(2, "Comment") }),
  z.object({ action: z.literal("START_REVIEW") }),
  z.object({
    action: z.literal("RESOLVE"),
    outcome: z.enum(DISPUTE_OUTCOMES),
    rationale: text(20, "Rationale"),
    newScore,
  }),
  z.object({ action: z.literal("ACCEPT") }),
  z.object({ action: z.literal("ESCALATE"), reason: text(20, "Reason") }),
  z.object({
    action: z.literal("DECIDE"),
    outcome: z.enum(DISPUTE_OUTCOMES),
    rationale: text(20, "Rationale"),
    newScore,
  }),
  z.object({ action: z.literal("WITHDRAW") }),
]);
export type DisputeActionInput = z.infer<typeof disputeActionSchema>;
export type DisputeAction = DisputeActionInput["action"];

export const disputeListQuerySchema = z.object({
  status: z.enum(DISPUTE_STATUSES).optional(),
});

export type DisputeSummary = {
  id: string;
  attemptId: string;
  examId: string;
  examTitle: string;
  candidateName: string;
  questionNumber: number | null;
  category: DisputeCategory;
  status: DisputeStatus;
  outcome: DisputeOutcome | null;
  scoreAtFiling: number;
  scoreAfter: number | null;
  totalMarks: number;
  createdAt: string;
  updatedAt: string;
};

export type DisputeEvent = {
  id: string;
  kind: DisputeEventKind;
  actorName: string;
  actorRole: Role;
  message: string;
  details: Record<string, unknown>;
  createdAt: string;
};

export type DisputeDetail = DisputeSummary & {
  reason: string;
  resolution: string | null;
  resolvedAt: string | null;
  escalationReason: string | null;
  escalatedAt: string | null;
  finalDecision: string | null;
  decidedAt: string | null;
  /** Live score now (may differ from scoreAfter if regraded later through other means). */
  currentScore: number;
  /** The disputed question, as the candidate answered it. */
  question: {
    attemptQuestionId: string;
    position: number;
    type: "MCQ_SINGLE" | "MCQ_MULTI" | "WRITTEN";
    body: string;
    marks: number;
    score: number | null;
    feedback: string | null;
    textAnswer: string | null;
    selected: string[];
    /** Only for reviewers, or for the candidate when the exam shows answers. */
    correct: string[] | null;
  } | null;
  /** Technical evidence for reviewers (attempt incidents). Empty for candidates. */
  incidents: { type: string; occurredAt: string }[];
  events: DisputeEvent[];
  /** Which actions the viewer may take right now (server-computed, also enforced). */
  allowed: DisputeAction[];
  /** Escalation deadline, when the viewer is the candidate and it is still possible. */
  escalateBy: string | null;
};

export type AttemptDisputes = {
  disputes: DisputeSummary[];
  /** Whether the candidate can file another dispute, and why not. */
  canFile: boolean;
  cannotFileReason: string | null;
  fileBy: string | null;
};
