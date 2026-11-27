import { z } from "zod";
import { MULTI_SCORING, windowErrors } from "@/shared/schemas/exam";

/**
 * Client-side validation for the exam settings form. Dates are the raw
 * `datetime-local` strings; they're converted to ISO only on submit.
 */
export const examFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(120, "Title is too long"),
    instructions: z.string().trim().max(4000, "Instructions are too long"),
    startsAt: z.string().min(1, "Enter a start date and time"),
    endsAt: z.string().min(1, "Enter an end date and time"),
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
      .max(1, "At most 1"),
    showAnswers: z.boolean(),
    recoveryWindowSeconds: z
      .number({ error: "Enter seconds" })
      .int("Whole seconds only")
      .min(0, "Cannot be negative")
      .max(600, "At most 600 seconds"),
  })
  .superRefine((v, ctx) => {
    const s = new Date(v.startsAt);
    const e = new Date(v.endsAt);
    if (Number.isNaN(s.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Invalid start time",
      });
      return;
    }
    if (Number.isNaN(e.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Invalid end time",
      });
      return;
    }
    for (const [path, message] of Object.entries(
      windowErrors({
        startsAt: s.toISOString(),
        endsAt: e.toISOString(),
        durationMinutes: v.durationMinutes,
      }),
    )) {
      ctx.addIssue({ code: "custom", path: [path], message });
    }
  });

export type ExamFormValues = z.infer<typeof examFormSchema>;
