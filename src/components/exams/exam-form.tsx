"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, fieldClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { applyFieldErrors } from "@/lib/api";
import { editLevel, LEVEL_ALLOWED } from "@/shared/exam-lifecycle";
import {
  MULTI_LABEL,
  MULTI_SCORING,
  type ExamPatch,
  type ExamSummary,
  type ExamValues,
} from "@/shared/schemas/exam";
import { examFormSchema, type ExamFormValues } from "./form/exam-form-schema";
import { examFormDefaults, toExamPayload } from "./form/exam-form-values";

/** Create or edit an exam's settings; fields lock according to the lifecycle stage. */
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
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<ExamFormValues>({
    mode: "onTouched",
    resolver: zodResolver(examFormSchema),
    defaultValues: examFormDefaults(exam),
  });

  async function submit(v: ExamFormValues) {
    try {
      await onSubmit(toExamPayload(v, exam, allowed));
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
          className={`${fieldClass} min-h-24`}
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
            className="choice"
            disabled={lock("shuffleQuestions")}
            {...register("shuffleQuestions")}
          />
          Shuffle question order
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="choice"
            disabled={lock("shuffleOptions")}
            {...register("shuffleOptions")}
          />
          Shuffle MCQ options
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="choice"
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
          <Button
            type="submit"
            disabled={isSubmitting || !isValid || (!!exam && !isDirty)}
          >
            {isSubmitting && <Spinner />}
            {submitLabel ?? (exam ? "Save changes" : "Create exam")}
          </Button>
        </div>
      )}
    </form>
  );
}
