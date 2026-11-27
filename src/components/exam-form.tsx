"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { applyFieldErrors } from "@/lib/api-client";
import { editLevel, LEVEL_ALLOWED } from "@/shared/exam-lifecycle";
import {
  MULTI_LABEL,
  MULTI_SCORING,
  windowErrors,
  type ExamPatch,
  type ExamSummary,
  type ExamValues,
} from "@/shared/schemas/exam";

/** Local datetime-local string (YYYY-MM-DDTHH:mm) from ISO string. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultWindow() {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    startsAt: toLocalInput(start.toISOString()),
    endsAt: toLocalInput(end.toISOString()),
  };
}

const formSchema = z
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
      ctx.addIssue({ code: "custom", path: ["startsAt"], message: "Invalid start time" });
      return;
    }
    if (Number.isNaN(e.getTime())) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Invalid end time" });
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

type FormValues = z.infer<typeof formSchema>;

export function ExamForm({
  exam,
  readOnly,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  exam?: ExamSummary;
  readOnly?: boolean;
  onSubmit: (v: ExamValues | ExamPatch) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const level = exam ? editLevel(exam) : "FULL";
  const allowed = LEVEL_ALLOWED[level];
  const lockedSettings = level !== "FULL";
  /** Per-field lock: read-only viewers, or fields the current lifecycle stage does not allow. */
  const lock = (f: string) => !!readOnly || !allowed.includes(f);
  const def = defaultWindow();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: exam
      ? {
          title: exam.title,
          instructions: exam.instructions,
          startsAt: toLocalInput(exam.startsAt),
          endsAt: toLocalInput(exam.endsAt),
          durationMinutes: exam.durationMinutes,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleOptions: exam.shuffleOptions,
          multiScoring: exam.multiScoring,
          negativeMarking: exam.negativeMarking,
          showAnswers: exam.showAnswers,
          recoveryWindowSeconds: exam.recoveryWindowSeconds,
        }
      : {
          title: "",
          instructions: "",
          startsAt: def.startsAt,
          endsAt: def.endsAt,
          durationMinutes: 30,
          shuffleQuestions: true,
          shuffleOptions: true,
          multiScoring: "PARTIAL",
          negativeMarking: 0,
          showAnswers: true,
          recoveryWindowSeconds: 120,
        },
  });

  async function submit(v: FormValues) {
    try {
      const full = {
        ...v,
        startsAt: new Date(v.startsAt).toISOString(),
        endsAt: new Date(v.endsAt).toISOString(),
      };
      if (exam) {
        // Send only the fields this stage allows, plus the updatedAt concurrency token.
        const patch: Record<string, unknown> = { updatedAt: exam.updatedAt };
        for (const k of allowed) {
          patch[k] = (full as Record<string, unknown>)[k];
        }
        await onSubmit(patch as ExamPatch);
      } else {
        await onSubmit(full);
      }
    } catch (e) {
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Could not save exam");
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {lockedSettings && !readOnly && (
        <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
          {level === "LIVE"
            ? "This exam is ongoing. Only the title, instructions (for new starts) and a later window end can be edited."
            : "This exam has completed. Only the title can be edited; use an answer-key rescore to correct scores."}
        </p>
      )}

      <Field label="Exam title" htmlFor="e-title" error={errors.title?.message}>
        <Input
          id="e-title"
          disabled={lock("title")}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
      </Field>

      <Field
        label="Instructions for candidates"
        htmlFor="e-inst"
        error={errors.instructions?.message}
      >
        <textarea
          id="e-inst"
          rows={3}
          disabled={lock("instructions")}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          {...register("instructions")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Window opens"
          htmlFor="e-start"
          error={errors.startsAt?.message}
        >
          <Input
            id="e-start"
            type="datetime-local"
            disabled={lock("startsAt")}
            {...register("startsAt")}
          />
        </Field>
        <Field
          label="Window closes"
          htmlFor="e-end"
          error={errors.endsAt?.message}
        >
          <Input
            id="e-end"
            type="datetime-local"
            disabled={lock("endsAt")}
            {...register("endsAt")}
          />
        </Field>
        <Field
          label="Duration (minutes)"
          htmlFor="e-dur"
          error={errors.durationMinutes?.message}
          hint="Candidate gets LEAST(start + duration, close)."
        >
          <Input
            id="e-dur"
            type="number"
            min={1}
            max={600}
            disabled={lock("durationMinutes")}
            {...register("durationMinutes", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Multiple-choice scoring"
          htmlFor="e-multi"
          error={errors.multiScoring?.message}
        >
          <Select
            id="e-multi"
            disabled={lock("multiScoring")}
            {...register("multiScoring")}
          >
            {MULTI_SCORING.map((m) => (
              <option key={m} value={m}>
                {MULTI_LABEL[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Negative marking (0 to 1)"
          htmlFor="e-neg"
          error={errors.negativeMarking?.message}
          hint="Fraction deducted on wrong single-choice MCQ."
        >
          <Input
            id="e-neg"
            type="number"
            step="0.05"
            min={0}
            max={1}
            disabled={lock("negativeMarking")}
            {...register("negativeMarking", { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Offline recovery window (sec)"
          htmlFor="e-rec"
          error={errors.recoveryWindowSeconds?.message}
          hint="Grace to sync answers captured before deadline (0 disables)."
        >
          <Input
            id="e-rec"
            type="number"
            min={0}
            max={600}
            disabled={lock("recoveryWindowSeconds")}
            {...register("recoveryWindowSeconds", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-6 pt-1 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            disabled={lock("shuffleQuestions")}
            {...register("shuffleQuestions")}
          />
          Shuffle question order
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            disabled={lock("shuffleOptions")}
            {...register("shuffleOptions")}
          />
          Shuffle MCQ options
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-primary h-4 w-4"
            disabled={lock("showAnswers")}
            {...register("showAnswers")}
          />
          Show answer key after results are published
        </label>
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {submitLabel ?? (exam ? "Save changes" : "Create exam")}
          </Button>
        </div>
      )}
    </form>
  );
}
