import "server-only";
import { tx } from "../db";
import { examRepo } from "../repositories/exam.repo";
import { Errors, assertUuid } from "../http";
import { audit } from "../audit";
import {
  windowErrors,
  type ActionItem,
  type ExamDetail,
  type ExaminerOverview,
  type ExamPatch,
  type ExamQuestionsInput,
  type ExamSummary,
  type ExamValues,
  type Phase,
  type Readiness,
} from "@/shared/schemas/exam";
import type { SessionUser } from "@/shared/schemas/auth";

export function computeReadiness(exam: ExamSummary): Readiness {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (exam.questionCount < 1) blockers.push("Add at least 1 question.");
  if (exam.totalMarks <= 0)
    blockers.push("Total marks must be greater than 0.");
  const wErrs = windowErrors({
    startsAt: exam.startsAt,
    endsAt: exam.endsAt,
    durationMinutes: exam.durationMinutes,
  });
  for (const m of Object.values(wErrs)) blockers.push(m);
  if (!exam.endsInFuture)
    blockers.push("Exam end time is already in the past.");
  if (exam.enrollmentCount < 1) {
    warnings.push(
      "No candidates are enrolled yet. You can publish now and enroll candidates before the window ends.",
    );
  }
  return { ready: blockers.length === 0, blockers, warnings };
}

/**
 * Examiners see only their own exams; Admins have read-only oversight of all exams.
 * Missing or other examiners' exams return 404 so existence is not leaked.
 */
async function readableExam(
  user: SessionUser,
  id: string,
): Promise<ExamSummary> {
  const uid = assertUuid(id, "Exam");
  const ownerId = user.role === "ADMIN" ? undefined : user.id;
  const exam = await examRepo.findById(uid, ownerId);
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

async function ownedExam(user: SessionUser, id: string): Promise<ExamSummary> {
  if (user.role !== "EXAMINER") throw Errors.forbidden();
  const exam = await examRepo.findById(assertUuid(id, "Exam"), user.id);
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

export const examService = {
  list: (user: SessionUser, q: { q?: string; phase?: Phase }) =>
    examRepo.list({
      ownerId: user.role === "ADMIN" ? undefined : user.id,
      q: q.q,
      phase: q.phase,
    }),

  /** Examiner dashboard: what needs attention now, what's live, what's next. Owner-scoped. */
  async overview(user: SessionUser): Promise<ExaminerOverview> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const exams = await examRepo.overview(user.id);
    const actions: ActionItem[] = [];
    const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

    for (const e of exams) {
      const base = { examId: e.id, examTitle: e.title };
      if (e.needsReview > 0) {
        actions.push({
          ...base,
          kind: "grade",
          title: `${plural(e.needsReview, "attempt")} to grade`,
          detail: "Written answers are waiting for marks.",
          cta: "Grade",
          tab: "grading",
        });
      } else if (e.phase === "COMPLETED" && e.submitted > 0 && !e.resultsPublished) {
        actions.push({
          ...base,
          kind: "publish",
          title: "Results ready to publish",
          detail: `${plural(e.submitted, "submission")} graded. Candidates can't see results yet.`,
          cta: "Publish",
          tab: "grading",
        });
      }
      if (e.phase === "DRAFT") {
        const missing = [
          e.questionCount === 0 && "questions",
          e.enrolled === 0 && "candidates",
        ].filter(Boolean);
        actions.push({
          ...base,
          kind: "draft",
          title: missing.length ? `Draft needs ${missing.join(" and ")}` : "Draft ready to publish",
          detail: missing.length
            ? "Finish setting it up before candidates can sit it."
            : "All requirements met. Review and publish when ready.",
          cta: missing.length ? "Continue" : "Review",
          tab: e.questionCount === 0 ? "questions" : e.enrolled === 0 ? "enrollments" : "review",
        });
      } else if (e.phase === "UPCOMING" && e.enrolled === 0) {
        actions.push({
          ...base,
          kind: "enroll",
          title: "No candidates enrolled",
          detail: "Published, but nobody can sit it yet.",
          cta: "Enroll",
          tab: "enrollments",
        });
      }
    }
    const order: Record<ActionItem["kind"], number> = { grade: 0, publish: 1, enroll: 2, draft: 3 };
    actions.sort((a, b) => order[a.kind] - order[b.kind]);

    return {
      actions,
      live: exams.filter((e) => e.phase === "ONGOING"),
      upcoming: exams.filter((e) => e.phase === "UPCOMING").slice(0, 5),
      totals: {
        enrolled: exams.reduce((n, e) => n + e.enrolled, 0),
        submitted: exams.reduce((n, e) => n + e.submitted, 0),
        awaitingGrading: exams.reduce((n, e) => n + e.needsReview, 0),
      },
    };
  },

  phaseCounts: (user: SessionUser) =>
    examRepo.phaseCounts(user.role === "ADMIN" ? undefined : user.id),

  async get(user: SessionUser, id: string): Promise<ExamDetail> {
    const exam = await readableExam(user, id);
    const questions = await examRepo.listQuestions(exam.id);
    return { ...exam, questions, readiness: computeReadiness(exam) };
  },

  async create(user: SessionUser, input: ExamValues): Promise<ExamDetail> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const id = await examRepo.create(user.id, input);
    return this.get(user, id);
  },

  async update(
    user: SessionUser,
    id: string,
    patch: ExamPatch,
  ): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status === "DRAFT") {
      const merged: ExamValues = {
        title: patch.title ?? existing.title,
        instructions: patch.instructions ?? existing.instructions,
        startsAt: patch.startsAt ?? existing.startsAt,
        endsAt: patch.endsAt ?? existing.endsAt,
        durationMinutes: patch.durationMinutes ?? existing.durationMinutes,
        shuffleQuestions: patch.shuffleQuestions ?? existing.shuffleQuestions,
        shuffleOptions: patch.shuffleOptions ?? existing.shuffleOptions,
        multiScoring: patch.multiScoring ?? existing.multiScoring,
        negativeMarking: patch.negativeMarking ?? existing.negativeMarking,
        showAnswers: patch.showAnswers ?? existing.showAnswers,
        recoveryWindowSeconds:
          patch.recoveryWindowSeconds ?? existing.recoveryWindowSeconds,
      };
      const wErrs = windowErrors(merged);
      if (Object.keys(wErrs).length > 0) {
        throw Errors.badRequest("Please fix the exam schedule", wErrs);
      }
      await examRepo.updateDraft(existing.id, merged);
    } else {
      // After publish, only title and instructions remain editable; structural settings are locked.
      const locked = (
        [
          "startsAt",
          "endsAt",
          "durationMinutes",
          "shuffleQuestions",
          "shuffleOptions",
          "multiScoring",
          "negativeMarking",
          "showAnswers",
          "recoveryWindowSeconds",
        ] as const
      ).filter((k) => patch[k] !== undefined);
      if (locked.length > 0) {
        throw Errors.conflict(
          "Exam settings are locked after publishing. Only title and instructions can be edited.",
        );
      }
      await examRepo.updateMeta(existing.id, {
        title: patch.title ?? existing.title,
        instructions: patch.instructions ?? existing.instructions,
      });
    }
    return this.get(user, existing.id);
  },

  async setQuestions(
    user: SessionUser,
    id: string,
    input: ExamQuestionsInput,
  ): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status !== "DRAFT") {
      throw Errors.conflict(
        "Questions and marks are locked once an exam is published.",
      );
    }
    const ids = input.items.map((x) => x.questionId);
    if (new Set(ids).size !== ids.length) {
      throw Errors.badRequest("Each question can only appear once in an exam.");
    }
    const ownedCount = await examRepo.countOwnedActiveQuestions(user.id, ids);
    if (ownedCount !== ids.length) {
      throw Errors.badRequest(
        "One or more selected questions are missing, archived, or not in your bank.",
      );
    }
    await tx((c) => examRepo.replaceQuestions(c, existing.id, input.items));
    return this.get(user, existing.id);
  },

  async publish(user: SessionUser, id: string): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status !== "DRAFT") {
      throw Errors.conflict("Only draft exams can be published.");
    }
    const r = computeReadiness(existing);
    if (!r.ready) {
      throw Errors.conflict(r.blockers[0] ?? "Exam is not ready to publish.");
    }
    await examRepo.setStatus(existing.id, "PUBLISHED");
    await audit(null, user, {
      action: "EXAM_PUBLISHED",
      examId: existing.id,
      targetType: "exam",
      targetId: existing.id,
      summary: `Published "${existing.title}" (${existing.questionCount} questions, ${existing.totalMarks} marks)`,
      details: {
        questionCount: existing.questionCount,
        totalMarks: existing.totalMarks,
        enrollmentCount: existing.enrollmentCount,
      },
    });
    return this.get(user, existing.id);
  },

  async close(user: SessionUser, id: string): Promise<ExamDetail> {
    const existing = await ownedExam(user, id);
    if (existing.status !== "PUBLISHED") {
      throw Errors.conflict("Only published exams can be closed.");
    }
    await examRepo.setStatus(existing.id, "CLOSED");
    await audit(null, user, {
      action: "EXAM_CLOSED",
      examId: existing.id,
      targetType: "exam",
      targetId: existing.id,
      summary: `Closed "${existing.title}" early`,
    });
    return this.get(user, existing.id);
  },

  /**
   * Duplicate an exam as a new DRAFT: same settings and question set/marks, no enrollments,
   * no attempts. A window that has already started is moved to tomorrow (same length) so the
   * copy is immediately publishable. Archived bank questions are skipped and reported.
   */
  async clone(
    user: SessionUser,
    id: string,
  ): Promise<ExamDetail & { skippedArchived: number }> {
    const src = await ownedExam(user, id);
    const questions = await examRepo.listQuestions(src.id);
    const keep = questions.filter((q) => !q.archived);

    const HOUR = 3_600_000;
    const startMs = Date.parse(src.startsAt);
    const windowMs = Date.parse(src.endsAt) - startMs;
    const newStart =
      startMs > Date.now() + HOUR
        ? startMs
        : Math.ceil((Date.now() + 24 * HOUR) / HOUR) * HOUR;
    const suffix = " (copy)";
    const title =
      src.title.length + suffix.length <= 120
        ? src.title + suffix
        : src.title.slice(0, 120 - suffix.length) + suffix;

    const newId = await tx(async (c) => {
      const r = await c.query<{ id: string }>(
        `INSERT INTO exams (
           owner_id, title, instructions, starts_at, ends_at, duration_minutes,
           shuffle_questions, shuffle_options, multi_scoring, negative_marking,
           show_answers, recovery_window_seconds
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [
          user.id,
          title,
          src.instructions,
          new Date(newStart).toISOString(),
          new Date(newStart + windowMs).toISOString(),
          src.durationMinutes,
          src.shuffleQuestions,
          src.shuffleOptions,
          src.multiScoring,
          src.negativeMarking,
          src.showAnswers,
          src.recoveryWindowSeconds,
        ],
      );
      const cloneId = r.rows[0].id;
      await examRepo.replaceQuestions(
        c,
        cloneId,
        keep.map((q) => ({ questionId: q.questionId, marks: Number(q.marks) })),
      );
      await audit(c, user, {
        action: "EXAM_CLONED",
        examId: cloneId,
        targetType: "exam",
        targetId: cloneId,
        summary: `Cloned "${src.title}" into a new draft (${keep.length} questions)`,
        details: {
          sourceExamId: src.id,
          copiedQuestions: keep.length,
          skippedArchived: questions.length - keep.length,
        },
      });
      return cloneId;
    });
    const detail = await this.get(user, newId);
    return { ...detail, skippedArchived: questions.length - keep.length };
  },
};
