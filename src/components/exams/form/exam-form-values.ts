import type { ExamPatch, ExamSummary, ExamValues } from "@/shared/schemas/exam";
import type { ExamFormValues } from "./exam-form-schema";

/** Local datetime-local string (YYYY-MM-DDTHH:mm) from ISO string. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** New exams default to a week-long window opening an hour from the next quarter hour. */
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

/** Initial form values: the exam's current settings, or sensible defaults for a new one. */
export function examFormDefaults(exam?: ExamSummary): ExamFormValues {
  if (exam) {
    return {
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
    };
  }
  const def = defaultWindow();
  return {
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
  };
}

/**
 * Form values → API payload. Creating sends everything; editing sends only the
 * fields this lifecycle stage allows, plus the updatedAt concurrency token.
 */
export function toExamPayload(
  v: ExamFormValues,
  exam: ExamSummary | undefined,
  allowed: readonly string[],
): ExamValues | ExamPatch {
  const full = {
    ...v,
    startsAt: new Date(v.startsAt).toISOString(),
    endsAt: new Date(v.endsAt).toISOString(),
  };
  if (!exam) return full;
  const patch: Record<string, unknown> = { updatedAt: exam.updatedAt };
  for (const k of allowed) {
    patch[k] = (full as Record<string, unknown>)[k];
  }
  return patch as ExamPatch;
}
