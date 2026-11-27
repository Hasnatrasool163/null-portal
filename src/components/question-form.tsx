"use client";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, fieldClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/misc";
import { applyFieldErrors } from "@/lib/api-client";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  QUESTION_TYPES,
  TYPE_LABEL,
  questionInputSchema,
  type QuestionInput,
  type Topic,
} from "@/shared/schemas/question";

const BLANK_OPTIONS = [
  { body: "", isCorrect: true },
  { body: "", isCorrect: false },
];

export function QuestionForm({
  initial,
  topics,
  onSubmit,
  onCancel,
}: {
  initial?: QuestionInput;
  topics: Topic[];
  onSubmit: (v: QuestionInput) => Promise<void>;
  onCancel: () => void;
}) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuestionInput>({
    resolver: zodResolver(questionInputSchema),
    defaultValues: initial ?? {
      topicId: topics[0]?.id ?? "",
      type: "MCQ_SINGLE",
      difficulty: "MEDIUM",
      body: "",
      defaultMarks: 1,
      options: BLANK_OPTIONS,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });
  const type = watch("type");
  const options = watch("options");

  function toggleCorrect(index: number, checked: boolean) {
    if (type === "MCQ_SINGLE") {
      options.forEach((_, i) =>
        setValue(`options.${i}.isCorrect`, i === index && checked, {
          shouldDirty: true,
        }),
      );
    } else {
      setValue(`options.${index}.isCorrect`, checked, { shouldDirty: true });
    }
  }

  async function submit(values: QuestionInput) {
    try {
      await onSubmit(values);
    } catch (e) {
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  const optionsError =
    (errors.options as { message?: string; root?: { message?: string } })
      ?.message ??
    (errors.options as { root?: { message?: string } })?.root?.message;

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Topic" htmlFor="q-topic" error={errors.topicId?.message}>
          <Select id="q-topic" {...register("topicId")}>
            {topics.length === 0 && <option value="">No topics yet</option>}
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type" htmlFor="q-type" error={errors.type?.message}>
          <Select
            id="q-type"
            {...register("type", {
              onChange: (e) => {
                const t = e.target.value;
                if (t === "WRITTEN") setValue("options", []);
                else if (options.length < 2)
                  setValue("options", BLANK_OPTIONS);
                else if (t === "MCQ_SINGLE") {
                  // keep at most one correct answer when narrowing to single choice
                  let seen = false;
                  options.forEach((o, i) => {
                    const keep = o.isCorrect && !seen;
                    if (o.isCorrect) seen = true;
                    setValue(`options.${i}.isCorrect`, keep);
                  });
                }
              },
            })}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Difficulty"
          htmlFor="q-diff"
          error={errors.difficulty?.message}
        >
          <Select id="q-diff" {...register("difficulty")}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Default marks"
          htmlFor="q-marks"
          error={errors.defaultMarks?.message}
          hint="Whole or half marks."
        >
          <Input
            id="q-marks"
            type="number"
            step="0.5"
            min="0.5"
            {...register("defaultMarks", { valueAsNumber: true })}
          />
        </Field>
      </div>

      <Field label="Question" htmlFor="q-body" error={errors.body?.message}>
        <textarea
          id="q-body"
          rows={3}
          aria-invalid={!!errors.body}
          className={`${fieldClass} min-h-24`}
          {...register("body")}
        />
      </Field>

      {type === "WRITTEN" ? (
        <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
          Written answers are graded manually by you, from 0 up to the
          question&apos;s marks.
        </p>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Options{" "}
            <span className="text-muted-foreground font-normal">
              (tick{" "}
              {type === "MCQ_SINGLE" ? "the correct one" : "all correct ones"})
            </span>
          </legend>
          {fields.map((f, i) => (
            <div key={f.id} className="flex items-start gap-2">
              <input
                type="checkbox"
                aria-label={`Option ${i + 1} is correct`}
                className="choice mt-3"
                checked={options[i]?.isCorrect ?? false}
                onChange={(e) => toggleCorrect(i, e.target.checked)}
              />
              <div className="flex-1">
                <Input
                  aria-label={`Option ${i + 1} text`}
                  aria-invalid={!!errors.options?.[i]?.body}
                  {...register(`options.${i}.body`)}
                />
                {errors.options?.[i]?.body && (
                  <p role="alert" className="text-destructive mt-1 text-xs">
                    {errors.options[i]?.body?.message}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove option ${i + 1}`}
                disabled={fields.length <= 2}
                onClick={() => remove(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {optionsError && (
            <p role="alert" className="text-destructive text-xs">
              {optionsError}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={fields.length >= 8}
            onClick={() => append({ body: "", isCorrect: false })}
          >
            <Plus className="h-4 w-4" />
            Add option
          </Button>
        </fieldset>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || topics.length === 0}>
          {isSubmitting && <Spinner />}
          Save question
        </Button>
      </div>
    </form>
  );
}
