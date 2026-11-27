import { z } from "zod";
import { emailSchema, nameSchema } from "./auth";

export const EXAM_STATUSES = ["DRAFT", "PUBLISHED", "CLOSED"] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];
export const PHASES = ["DRAFT", "UPCOMING", "ONGOING", "COMPLETED"] as const;
export type Phase = (typeof PHASES)[number];
export const PHASE_LABEL: Record<Phase, string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
};
export const MULTI_SCORING = ["PARTIAL", "ALL_OR_NOTHING"] as const;
export type MultiScoring = (typeof MULTI_SCORING)[number];
export const MULTI_LABEL: Record<MultiScoring, string> = {
  PARTIAL: "Partial credit",
  ALL_OR_NOTHING: "All or nothing",
};

const iso = z.iso.datetime({ offset: true, error: "Enter a valid date and time" });

/** Window rules shared by the form, the API and the merge-on-update check in the service. */
export function windowErrors(v: {
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}): Record<string, string> {
  const errs: Record<string, string> = {};
  const start = Date.parse(v.startsAt);
  const end = Date.parse(v.endsAt);
  if (!(start < end)) {
    errs.endsAt = "End must be after the start";
    return errs;
  }
  const windowMinutes = Math.floor((end - start) / 60000);
  if (v.durationMinutes > windowMinutes)
    errs.durationMinutes = `Duration cannot exceed the window length (${windowMinutes} min)`;
  return errs;
}

const fields = {
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  instructions: z.string().trim().max(4000, "Instructions are too long"),
  startsAt: iso,
  endsAt: iso,
  durationMinutes: z
    .number({ error: "Enter the duration" })
    .int("Whole minutes only")
    .min(1, "At least 1 minute")
    .max(600, "At most 600 minutes"),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  multiScoring: z.enum(MULTI_SCORING),
  negativeMarking: z
    .number({ error: "Enter a fraction between 0 and 1" })
    .min(0, "Cannot be negative")
    .max(1, "At most 1 (full marks deducted)"),
  showAnswers: z.boolean(),
  recoveryWindowSeconds: z
    .number({ error: "Enter seconds" })
    .int("Whole seconds only")
    .min(0, "Cannot be negative")
    .max(600, "At most 600 seconds"),
};
const fieldsObject = z.object(fields);

export const examInputSchema = fieldsObject
  .extend({ instructions: fields.instructions.default("") })
  .superRefine((v, ctx) => {
    for (const [path, message] of Object.entries(windowErrors(v)))
      ctx.addIssue({ code: "custom", path: [path], message });
  });
export type ExamInput = z.input<typeof examInputSchema>;
export type ExamValues = z.output<typeof examInputSchema>;

/** PATCH: any subset. Cross-field window rules are re-checked on the merged record in the service. */
export const examPatchSchema = fieldsObject
  .partial()
  .extend({ updatedAt: iso.optional() });
export type ExamPatch = z.infer<typeof examPatchSchema>;

/** Admin: close or cancel an exam. A reason is mandatory and audited. */
export const adminCloseSchema = z.object({
  action: z.enum(["CLOSE", "CANCEL"]),
  reason: z.string().trim().min(5, "Give a reason (at least 5 characters)").max(500),
});
export type AdminCloseInput = z.infer<typeof adminCloseSchema>;

/** Admin: hand an exam to another active examiner. */
export const reassignOwnerSchema = z.object({
  ownerId: z.uuid(),
  reason: z.string().trim().max(500).optional(),
});

/** Examiner: audited answer-key correction for a completed exam. */
export const rescoreSchema = z.object({
  questionId: z.uuid(),
  correctOptionIds: z.array(z.number().int()).min(1, "Pick at least one correct option").max(20),
  reason: z.string().trim().min(3, "Give a reason (at least 3 characters)").max(500),
  updatedAt: iso.optional(),
});
export type RescoreInput = z.infer<typeof rescoreSchema>;

export const examQuestionsSchema = z.object({
  items: z
    .array(
      z.object({
        questionId: z.uuid(),
        marks: z
          .number({ error: "Enter the marks" })
          .positive("Marks must be greater than 0")
          .max(100, "Marks cannot exceed 100")
          .refine((v) => Number.isInteger(v * 2), "Use whole or half marks"),
      }),
    )
    .max(200, "At most 200 questions"),
  updatedAt: iso.optional(),
});
export type ExamQuestionsInput = z.infer<typeof examQuestionsSchema>;

export const examListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  phase: z.enum(PHASES).optional(),
});

export const enrollSchema = z.object({
  candidateIds: z.array(z.uuid()).min(1, "Choose at least one candidate").max(500),
});
export const candidateSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  examId: z.uuid().optional(),
});

/** One row of a candidate CSV import. */
export const candidateRowSchema = z.object({ name: nameSchema, email: emailSchema });
export type CandidateRow = z.infer<typeof candidateRowSchema>;
export const candidateImportPayloadSchema = z.object({
  content: z.string().min(1, "File is empty").max(200_000, "File is too large"),
});

export type ExamSummary = {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  instructions: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  status: ExamStatus;
  phase: Phase;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  multiScoring: MultiScoring;
  negativeMarking: number;
  showAnswers: boolean;
  recoveryWindowSeconds: number;
  resultsPublishedAt: string | null;
  totalMarks: number;
  questionCount: number;
  enrollmentCount: number;
  endsInFuture: boolean;
  createdAt: string;
  /** Optimistic-concurrency token: send back unchanged with every edit. */
  updatedAt: string;
  /** Real (non-sandbox) attempts that have started. */
  startedAttempts: number;
  closeReason: string | null;
  cancelled: boolean;
  /** When candidate-visible content last changed after publishing. */
  contentChangedAt: string | null;
};
export type ExamQuestionRow = {
  questionId: string;
  position: number;
  marks: number;
  body: string;
  type: "MCQ_SINGLE" | "MCQ_MULTI" | "WRITTEN";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topicName: string;
  archived: boolean;
};
export type Readiness = { ready: boolean; blockers: string[]; warnings: string[] };
export type ExamDetail = ExamSummary & {
  questions: ExamQuestionRow[];
  readiness: Readiness;
};
export type EnrolledCandidate = {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
};
export type CandidateOption = {
  id: string;
  name: string;
  email: string;
  enrolled: boolean;
};
export type CandidateImportRowResult = {
  row: number;
  ok: boolean;
  name: string;
  email: string;
  kind: "NEW" | "EXISTING" | "ERROR";
  errors: { field: string; message: string }[];
};
export type CandidateImportPreview = {
  total: number;
  valid: number;
  newAccounts: number;
  rows: CandidateImportRowResult[];
};
export type CandidateImportResult = {
  enrolled: number;
  alreadyEnrolled: number;
  created: { name: string; email: string; tempPassword: string }[];
};
