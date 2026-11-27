import { z } from "zod";

export const QUESTION_TYPES = ["MCQ_SINGLE", "MCQ_MULTI", "WRITTEN"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const TYPE_LABEL: Record<QuestionType, string> = {
  MCQ_SINGLE: "Single choice",
  MCQ_MULTI: "Multiple choice",
  WRITTEN: "Written",
};
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

export const topicNameSchema = z
  .string()
  .trim()
  .min(1, "Topic name is required")
  .max(60, "Topic name is too long");
export const topicSchema = z.object({ name: topicNameSchema });
export type Topic = { id: string; name: string; questionCount: number };

const optionSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Option text is required")
    .max(500, "Option is too long"),
  isCorrect: z.boolean(),
});
export type OptionInput = z.infer<typeof optionSchema>;

const base = {
  type: z.enum(QUESTION_TYPES, { error: "Choose a question type" }),
  difficulty: z.enum(DIFFICULTIES, { error: "Choose a difficulty" }),
  body: z
    .string()
    .trim()
    .min(5, "Question must be at least 5 characters")
    .max(4000, "Question is too long"),
  defaultMarks: z
    .number({ error: "Enter the marks" })
    .positive("Marks must be greater than 0")
    .max(100, "Marks cannot exceed 100")
    .refine((v) => Number.isInteger(v * 2), "Use whole or half marks (0.5 steps)"),
  options: z.array(optionSchema).max(8, "At most 8 options"),
};

/** Type-specific rules shared by the form, the API and bulk import. */
function rules(
  v: { type: QuestionType; options: OptionInput[] },
  ctx: z.RefinementCtx,
) {
  const issue = (message: string) =>
    ctx.addIssue({ code: "custom", path: ["options"], message });
  if (v.type === "WRITTEN") {
    if (v.options.length > 0) issue("Written questions have no options");
    return;
  }
  if (v.options.length < 2) return issue("Add at least 2 options");
  const texts = v.options.map((o) => o.body.trim().toLowerCase());
  if (new Set(texts).size !== texts.length)
    return issue("Options must be different from each other");
  const correct = v.options.filter((o) => o.isCorrect).length;
  if (v.type === "MCQ_SINGLE" && correct !== 1)
    issue("Mark exactly one option as correct");
  if (v.type === "MCQ_MULTI" && correct < 1)
    issue("Mark at least one option as correct");
}

export const questionInputSchema = z
  .object({ topicId: z.uuid("Choose a topic"), ...base })
  .superRefine(rules);
export type QuestionInput = z.infer<typeof questionInputSchema>;

/** One row of a bulk import (topic by name; created if missing). */
export const questionImportRowSchema = z
  .object({
    topicName: topicNameSchema,
    ...base,
  })
  .superRefine(rules);
export type QuestionImportRow = z.infer<typeof questionImportRowSchema>;

export const questionListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  topicId: z.uuid().optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

export const importPayloadSchema = z.object({
  format: z.enum(["csv", "json"]),
  content: z.string().min(1, "File is empty").max(500_000, "File is too large"),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;

export type QuestionListItem = {
  id: string;
  topicId: string;
  topicName: string;
  type: QuestionType;
  difficulty: Difficulty;
  body: string;
  defaultMarks: number;
  locked: boolean;
  updatedAt: string;
};
export type QuestionDetail = QuestionListItem & {
  options: { id: number; body: string; isCorrect: boolean; position: number }[];
};
export type QuestionList = {
  items: QuestionListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ImportRowResult = {
  row: number;
  ok: boolean;
  summary: string;
  errors: { field: string; message: string }[];
};
export type ImportPreview = {
  total: number;
  valid: number;
  rows: ImportRowResult[];
};
