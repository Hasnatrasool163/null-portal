import "server-only";
import type { PoolClient } from "pg";
import { query, tx } from "../db";
import { examRepo } from "../repositories/exam.repo";
import { attemptRepo } from "../repositories/attempt.repo";
import { Errors, assertUuid } from "../http";
import { audit } from "../audit";
import {
  notifyEnrolled,
  notifyExamAvailable,
  notifyExamCancelled,
  notifyScoreChanged,
  notifyUsers,
} from "../notifications";
import { scoreObjectiveAnswer, type SnapshotOption } from "../exam/scoring";
import {
  LEVEL_ALLOWED,
  assertFresh,
  editLevel,
  levelReason,
} from "../exam/lifecycle";
import { finalizeAttemptInTx, finalizeIfExpiredInTx } from "./attempt.service";
import type { QuestionType } from "@/shared/schemas/question";
import {
  windowErrors,
  type ActionItem,
  type AdminCloseInput,
  type MultiScoring,
  type RescoreInput,
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

/** Row-locked read of the examiner's own exam inside a transaction. */
async function lockOwned(
  c: PoolClient,
  user: SessionUser,
  id: string,
): Promise<ExamSummary> {
  const exam = await examRepo.findById(assertUuid(id, "Exam"), user.id, {
    c,
    lock: true,
  });
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

/** Row-locked read of any exam (admin operations). */
async function lockAny(c: PoolClient, id: string): Promise<ExamSummary> {
  const exam = await examRepo.findById(assertUuid(id, "Exam"), undefined, {
    c,
    lock: true,
  });
  if (!exam) throw Errors.notFound("Exam not found");
  return exam;
}

/** "Dec 01, 09:00 UTC" — matches the server-generated notification wording. */
const fmtUtc = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";

const FIELD_COLUMN: Record<string, string> = {
  title: "title",
  instructions: "instructions",
  startsAt: "starts_at",
  endsAt: "ends_at",
  durationMinutes: "duration_minutes",
  shuffleQuestions: "shuffle_questions",
  shuffleOptions: "shuffle_options",
  multiScoring: "multi_scoring",
  negativeMarking: "negative_marking",
  showAnswers: "show_answers",
  recoveryWindowSeconds: "recovery_window_seconds",
};

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
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const { updatedAt, ...fields } = patch;
    const examId = await tx(async (c) => {
      const ex = await lockOwned(c, user, id);
      assertFresh(ex, updatedAt, false);
      const level = editLevel(ex);

      // Only fields that actually change count (the UI submits the whole form).
      const current = ex as unknown as Record<string, unknown>;
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
        const from = current[k];
        const same =
          k === "startsAt" || k === "endsAt"
            ? Date.parse(String(from)) === Date.parse(String(v))
            : from === v;
        if (!same) changes[k] = { from, to: v };
      }
      const keys = Object.keys(changes);
      if (keys.length === 0) return ex.id;

      const allowed = LEVEL_ALLOWED[level];
      const locked = keys.filter((k) => !allowed.includes(k));
      if (locked.length > 0) {
        throw Errors.conflict(
          `${levelReason(ex, level)} Locked: ${locked.join(", ")}.`,
        );
      }
      if (
        level === "LIVE" &&
        changes.endsAt &&
        !(Date.parse(String(changes.endsAt.to)) > Date.parse(ex.endsAt))
      ) {
        throw Errors.conflict(
          "While the exam is ongoing the window end can only be extended, not shortened.",
          { endsAt: "Must be later than the current end" },
        );
      }

      const merged: ExamValues = {
        title: fields.title ?? ex.title,
        instructions: fields.instructions ?? ex.instructions,
        startsAt: fields.startsAt ?? ex.startsAt,
        endsAt: fields.endsAt ?? ex.endsAt,
        durationMinutes: fields.durationMinutes ?? ex.durationMinutes,
        shuffleQuestions: fields.shuffleQuestions ?? ex.shuffleQuestions,
        shuffleOptions: fields.shuffleOptions ?? ex.shuffleOptions,
        multiScoring: fields.multiScoring ?? ex.multiScoring,
        negativeMarking: fields.negativeMarking ?? ex.negativeMarking,
        showAnswers: fields.showAnswers ?? ex.showAnswers,
        recoveryWindowSeconds:
          fields.recoveryWindowSeconds ?? ex.recoveryWindowSeconds,
      };
      const wErrs = windowErrors(merged);
      if (Object.keys(wErrs).length > 0) {
        throw Errors.badRequest("Please fix the exam schedule", wErrs);
      }
      if (ex.status !== "DRAFT" && (changes.endsAt || changes.startsAt)) {
        const r = await c.query<{ ok: boolean }>(
          "SELECT $1::timestamptz > now() AS ok",
          [merged.endsAt],
        );
        if (!r.rows[0].ok) {
          throw Errors.conflict("Exam end time is already in the past.", {
            endsAt: "Must be in the future",
          });
        }
      }

      await examRepo.patchInTx(
        c,
        ex.id,
        Object.fromEntries(
          keys.map((k) => [FIELD_COLUMN[k], (fields as Record<string, unknown>)[k]]),
        ),
        { contentChanged: ex.status !== "DRAFT" && level === "FULL" },
      );
      if (ex.status !== "DRAFT") {
        await audit(c, user, {
          action: "EXAM_UPDATED",
          examId: ex.id,
          targetType: "exam",
          targetId: ex.id,
          summary: `Edited \"${ex.title}\" (${ex.phase.toLowerCase()}): ${keys.join(", ")}`,
          details: { level, phase: ex.phase, changes },
        });
      }
      // Candidates who still have to sit it hear about schedule / duration / instruction changes.
      const LABEL: Record<string, string> = {
        startsAt: "start time",
        endsAt: "end time",
        durationMinutes: "duration",
        instructions: "instructions",
      };
      const relevant = keys.filter((k) => k in LABEL);
      if (ex.status === "PUBLISHED" && relevant.length > 0) {
        const what = relevant.map((k) => LABEL[k]);
        const sched = [
          changes.startsAt && `starts ${fmtUtc(String(changes.startsAt.to))}`,
          changes.endsAt && `ends ${fmtUtc(String(changes.endsAt.to))}`,
          changes.durationMinutes && `${changes.durationMinutes.to} min`,
        ].filter(Boolean);
        await notifyEnrolled(
          c,
          ex.id,
          {
            type: "EXAM_UPDATED",
            title: `Exam changed: ${ex.title}`,
            body: `The examiner changed the ${what.join(", ")}.${sched.length ? ` Now: ${sched.join(", ")}.` : ""}${changes.instructions ? " Read the updated instructions before you start." : ""}`,
            link: "/dashboard",
            dedupeKey: `exam-updated:${ex.id}:${Date.now()}`,
          },
          true,
        );
      }
      return ex.id;
    });
    return this.get(user, examId);
  },

  async setQuestions(
    user: SessionUser,
    id: string,
    input: ExamQuestionsInput,
  ): Promise<ExamDetail> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const examId = await tx(async (c) => {
      const ex = await lockOwned(c, user, id);
      assertFresh(ex, input.updatedAt, false);
      const level = editLevel(ex);
      if (level !== "FULL") {
        throw Errors.conflict(
          `Questions and marks cannot be changed now. ${levelReason(ex, level)}`,
        );
      }
      const ids = input.items.map((x) => x.questionId);
      if (new Set(ids).size !== ids.length) {
        throw Errors.badRequest("Each question can only appear once in an exam.");
      }
      if (ex.status !== "DRAFT" && input.items.length < 1) {
        throw Errors.conflict("A published exam must keep at least 1 question.");
      }
      const ownedCount = await examRepo.countOwnedOrAssignedQuestions(
        c,
        ex.id,
        ex.ownerId,
        ids,
      );
      if (ownedCount !== ids.length) {
        throw Errors.badRequest(
          "One or more selected questions are missing, archived, or not in your bank.",
        );
      }
      const before = (await examRepo.listQuestions(ex.id)).map((q) => ({
        questionId: q.questionId,
        marks: q.marks,
      }));
      await examRepo.replaceQuestions(c, ex.id, input.items);
      await examRepo.patchInTx(c, ex.id, {}, {
        contentChanged: ex.status !== "DRAFT",
      });
      if (ex.status !== "DRAFT") {
        await audit(c, user, {
          action: "EXAM_QUESTIONS_CHANGED",
          examId: ex.id,
          targetType: "exam",
          targetId: ex.id,
          summary: `Changed question set of \"${ex.title}\" (${before.length} → ${input.items.length} questions)`,
          details: { before, after: input.items },
        });
      }
      return ex.id;
    });
    return this.get(user, examId);
  },

  async publish(user: SessionUser, id: string): Promise<ExamDetail> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const examId = await tx(async (c) => {
      const existing = await lockOwned(c, user, id);
      if (existing.status !== "DRAFT") {
        throw Errors.conflict("Only draft exams can be published.");
      }
      const r = computeReadiness(existing);
      if (!r.ready) {
        throw Errors.conflict(r.blockers[0] ?? "Exam is not ready to publish.");
      }
      await examRepo.patchInTx(c, existing.id, { status: "PUBLISHED" });
      await notifyExamAvailable(c, existing.id, "EXAM_PUBLISHED");
      await audit(c, user, {
        action: "EXAM_PUBLISHED",
        examId: existing.id,
        targetType: "exam",
        targetId: existing.id,
        summary: `Published \"${existing.title}\" (${existing.questionCount} questions, ${existing.totalMarks} marks)`,
        details: {
          questionCount: existing.questionCount,
          totalMarks: existing.totalMarks,
          enrollmentCount: existing.enrollmentCount,
        },
      });
      return existing.id;
    });
    return this.get(user, examId);
  },

  async close(user: SessionUser, id: string): Promise<ExamDetail> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const examId = await tx(async (c) => {
      const existing = await lockOwned(c, user, id);
      if (existing.status !== "PUBLISHED") {
        throw Errors.conflict("Only published exams can be closed.");
      }
      await examRepo.patchInTx(c, existing.id, {
        status: "CLOSED",
        closed_by: user.id,
      });
      const inProgress = await c.query<{ id: string }>(
        `SELECT id FROM real_attempts
         WHERE exam_id = $1 AND status = 'IN_PROGRESS'
         ORDER BY id`,
        [existing.id],
      );
      let finalizedAttempts = 0;
      for (const row of inProgress.rows) {
        const a = await attemptRepo.findByIdForUpdate(c, row.id);
        if (a && a.status === "IN_PROGRESS") {
          await finalizeAttemptInTx(c, a, "EXAMINER");
          finalizedAttempts++;
        }
      }
      await audit(c, user, {
        action: "EXAM_CLOSED",
        examId: existing.id,
        targetType: "exam",
        targetId: existing.id,
        summary: `Closed \"${existing.title}\" early`,
        details: { finalizedAttempts },
      });
      return existing.id;
    });
    return this.get(user, examId);
  },

  /** Admin: close (PUBLISHED) or cancel (DRAFT/PUBLISHED) an exam. Reason required, audited. */
  async adminClose(
    user: SessionUser,
    id: string,
    input: AdminCloseInput,
  ): Promise<ExamDetail> {
    if (user.role !== "ADMIN") throw Errors.forbidden();
    const examId = await tx(async (c) => {
      const ex = await lockAny(c, id);
      if (ex.status === "CLOSED") {
        throw Errors.conflict(
          ex.cancelled ? "This exam is already cancelled." : "This exam is already closed.",
        );
      }
      if (input.action === "CLOSE" && ex.status !== "PUBLISHED") {
        throw Errors.conflict(
          "Only published exams can be closed. Cancel a draft instead.",
        );
      }
      const cancel = input.action === "CANCEL";
      await examRepo.patchInTx(c, ex.id, {
        status: "CLOSED",
        close_reason: input.reason,
        closed_by: user.id,
        cancelled: cancel,
        ...(cancel ? { results_published_at: null } : {}),
      });
      const inProgress = await c.query<{ id: string }>(
        `SELECT id FROM real_attempts
         WHERE exam_id = $1 AND status = 'IN_PROGRESS'
         ORDER BY id`,
        [ex.id],
      );
      let finalizedAttempts = 0;
      for (const row of inProgress.rows) {
        const a = await attemptRepo.findByIdForUpdate(c, row.id);
        if (a && a.status === "IN_PROGRESS") {
          await finalizeAttemptInTx(c, a, "EXAMINER");
          finalizedAttempts++;
        }
      }
      let revokedCertificates = 0;
      if (cancel) {
        await notifyExamCancelled(c, ex.id, input.reason);
        const rev = await c.query(
          `UPDATE report_verifications rv
           SET revoked = true
           FROM attempts a
           WHERE rv.attempt_id = a.id AND a.exam_id = $1 AND NOT rv.revoked`,
          [ex.id],
        );
        revokedCertificates = rev.rowCount ?? 0;
      }
      await audit(c, user, {
        action: cancel ? "EXAM_CANCELLED" : "EXAM_CLOSED",
        examId: ex.id,
        targetType: "exam",
        targetId: ex.id,
        summary: `Admin ${cancel ? "cancelled" : "closed"} \"${ex.title}\": ${input.reason}`,
        details: {
          reason: input.reason,
          previousStatus: ex.status,
          phase: ex.phase,
          startedAttempts: ex.startedAttempts,
          finalizedAttempts,
          revokedCertificates,
          ownerId: ex.ownerId,
        },
      });
      return ex.id;
    });
    return this.get(user, examId);
  },

  /** Admin: hand an exam to another active examiner. */
  async reassignOwner(
    user: SessionUser,
    id: string,
    input: { ownerId: string; reason?: string },
  ): Promise<ExamDetail> {
    if (user.role !== "ADMIN") throw Errors.forbidden();
    const examId = await tx(async (c) => {
      const ex = await lockAny(c, id);
      if (input.ownerId === ex.ownerId) {
        throw Errors.conflict("That examiner already owns this exam.");
      }
      const t = await c.query<{ id: string; name: string; role: string; is_active: boolean }>(
        "SELECT id, name, role, is_active FROM users WHERE id = $1",
        [input.ownerId],
      );
      const target = t.rows[0];
      if (!target || target.role !== "EXAMINER" || !target.is_active) {
        throw Errors.badRequest("The new owner must be an active examiner.", {
          ownerId: "Not an active examiner",
        });
      }
      await examRepo.patchInTx(c, ex.id, { owner_id: target.id });
      await audit(c, user, {
        action: "EXAM_OWNER_REASSIGNED",
        examId: ex.id,
        targetType: "exam",
        targetId: ex.id,
        summary: `Reassigned \"${ex.title}\" from ${ex.ownerName} to ${target.name}`,
        details: {
          from: { id: ex.ownerId, name: ex.ownerName },
          to: { id: target.id, name: target.name },
          reason: input.reason ?? null,
        },
      });
      const key = `reassigned:${ex.id}:${Date.now()}`;
      await notifyUsers(c, [target.id], {
        type: "EXAM_REASSIGNED",
        title: `You now own: ${ex.title}`,
        body: `An administrator handed this exam to you from ${ex.ownerName}.${input.reason ? ` Reason: ${input.reason}` : ""}`,
        link: `/exams/${ex.id}`,
        examId: ex.id,
        dedupeKey: key,
      });
      await notifyUsers(c, [ex.ownerId], {
        type: "EXAM_REASSIGNED",
        title: `Exam reassigned: ${ex.title}`,
        body: `An administrator handed this exam to ${target.name}. You no longer manage it.${input.reason ? ` Reason: ${input.reason}` : ""}`,
        link: "/exams",
        examId: ex.id,
        dedupeKey: key,
      });
      return ex.id;
    });
    return this.get(user, examId);
  },

  /**
   * Audited answer-key correction for a COMPLETED exam. The snapshot key of every submitted
   * attempt is updated, affected answers are rescored, and both old and new values are kept
   * in exam_rescores / answer_rescores.
   */
  async rescore(user: SessionUser, id: string, input: RescoreInput) {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    return tx(async (c) => {
      const ex = await lockOwned(c, user, id);
      assertFresh(ex, input.updatedAt, false);
      if (editLevel(ex) !== "TITLE_ONLY" || ex.status === "DRAFT") {
        throw Errors.conflict(
          "Rescoring is only available once the exam has completed.",
        );
      }
      if (ex.cancelled) throw Errors.conflict("This exam was cancelled.");

      // Settle attempts whose deadline has passed; refuse while any are still running.
      const running = await c.query<{ id: string }>(
        `SELECT id FROM real_attempts WHERE exam_id = $1 AND status = 'IN_PROGRESS'`,
        [ex.id],
      );
      for (const r of running.rows) {
        const a = await attemptRepo.findByIdForUpdate(c, r.id);
        if (a) await finalizeIfExpiredInTx(c, a);
      }
      const still = await c.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM real_attempts WHERE exam_id = $1 AND status = 'IN_PROGRESS'`,
        [ex.id],
      );
      if (still.rows[0].n > 0) {
        throw Errors.conflict(
          "Some attempts are still in progress. Rescore after they finish.",
        );
      }

      const inExam = await c.query(
        "SELECT 1 FROM exam_questions WHERE exam_id = $1 AND question_id = $2",
        [ex.id, input.questionId],
      );
      if (inExam.rowCount === 0) throw Errors.notFound("Question not in this exam");

      const rows = await c.query<{
        id: string;
        attempt_id: string;
        position: number;
        type: QuestionType;
        marks: number;
        options: SnapshotOption[];
        multi_scoring: MultiScoring;
        negative_marking: number;
        total_score: number | null;
      }>(
        `SELECT aq.id, aq.attempt_id, aq.position, aq.type, aq.marks, aq.options,
                a.multi_scoring, a.negative_marking, a.total_score
         FROM attempt_questions aq
         JOIN real_attempts a ON a.id = aq.attempt_id
         WHERE a.exam_id = $1 AND aq.question_id = $2 AND a.status = 'SUBMITTED'
         ORDER BY aq.attempt_id
         FOR UPDATE OF aq`,
        [ex.id, input.questionId],
      );
      if (rows.rows.length === 0) {
        throw Errors.conflict("There are no submitted attempts to rescore.");
      }
      const first = rows.rows[0];
      if (first.type === "WRITTEN") {
        throw Errors.badRequest(
          "Written questions have no answer key; correct them by grading.",
        );
      }
      const newIds = [...new Set(input.correctOptionIds)].sort((a, b) => a - b);
      if (first.type === "MCQ_SINGLE" && newIds.length !== 1) {
        throw Errors.badRequest("A single-choice question has exactly one correct option.", {
          correctOptionIds: "Pick exactly one",
        });
      }
      const oldIds = first.options
        .filter((o) => o.isCorrect)
        .map((o) => o.id)
        .sort((a, b) => a - b);
      if (oldIds.join(",") === newIds.join(",")) {
        throw Errors.conflict("The answer key is unchanged.");
      }
      if (!newIds.every((n) => first.options.some((o) => o.id === n))) {
        throw Errors.badRequest("Unknown option selected.", {
          correctOptionIds: "Not an option of this question",
        });
      }

      const run = await c.query<{ id: string }>(
        `INSERT INTO exam_rescores
           (exam_id, question_id, old_correct_ids, new_correct_ids, reason, rescored_by)
         VALUES ($1,$2,$3::int[],$4::int[],$5,$6) RETURNING id`,
        [ex.id, input.questionId, oldIds, newIds, input.reason, user.id],
      );
      const rescoreId = run.rows[0].id;

      let changed = 0;
      let skipped = 0;
      const touched = new Set<string>();
      const totals = new Map<string, { from: number | null; to: number; position: number }>();
      for (const aq of rows.rows) {
        if (!newIds.every((n) => aq.options.some((o) => o.id === n))) {
          skipped++;
          continue;
        }
        const newOptions = aq.options.map((o) => ({
          ...o,
          isCorrect: newIds.includes(o.id),
        }));
        await c.query("UPDATE attempt_questions SET options = $2::jsonb WHERE id = $1", [
          aq.id,
          JSON.stringify(newOptions),
        ]);
        const ans = await c.query<{ selected: number[]; old_score: number | null }>(
          `SELECT selected_option_ids AS selected, score AS old_score
           FROM answers WHERE attempt_question_id = $1 FOR UPDATE`,
          [aq.id],
        );
        if (!ans.rows[0]) continue;
        const newScore = scoreObjectiveAnswer({
          type: aq.type,
          marks: Number(aq.marks),
          options: newOptions,
          selectedOptionIds: ans.rows[0].selected ?? [],
          multiScoring: aq.multi_scoring,
          negativeMarking: Number(aq.negative_marking),
        });
        const oldScore =
          ans.rows[0].old_score === null ? null : Number(ans.rows[0].old_score);
        if (newScore === oldScore) continue;
        await c.query("UPDATE answers SET score = $2 WHERE attempt_question_id = $1", [
          aq.id,
          newScore,
        ]);
        const oldTotal = aq.total_score === null ? null : Number(aq.total_score);
        const newTotal = await attemptRepo.recomputeTotalScore(c, aq.attempt_id);
        await c.query(
          `INSERT INTO answer_rescores
             (rescore_id, attempt_id, attempt_question_id, old_score, new_score,
              old_total_score, new_total_score)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [rescoreId, aq.attempt_id, aq.id, oldScore, newScore, oldTotal, newTotal],
        );
        touched.add(aq.attempt_id);
        totals.set(aq.attempt_id, {
          from: totals.has(aq.attempt_id) ? totals.get(aq.attempt_id)!.from : oldTotal,
          to: Number(newTotal),
          position: aq.position,
        });
        changed++;
      }
      // Everyone whose published score moved is told, not only whoever disputed it.
      for (const [attemptId, t] of totals) {
        await notifyScoreChanged(c, attemptId, {
          from: t.from,
          to: t.to,
          reason: `the answer key for Q${t.position + 1} was corrected (${input.reason})`,
        });
      }
      await c.query("UPDATE exam_rescores SET attempts_affected = $2 WHERE id = $1", [
        rescoreId,
        touched.size,
      ]);
      await examRepo.patchInTx(c, ex.id, {});
      await audit(c, user, {
        action: "EXAM_RESCORED",
        examId: ex.id,
        targetType: "question",
        targetId: input.questionId,
        summary: `Rescored \"${ex.title}\": key ${oldIds.join(",")} → ${newIds.join(",")}, ${changed} answer(s) changed`,
        details: {
          rescoreId,
          reason: input.reason,
          oldCorrectIds: oldIds,
          newCorrectIds: newIds,
          answersChanged: changed,
          attemptsAffected: touched.size,
          skippedDifferentSnapshot: skipped,
        },
      });
      return {
        rescoreId,
        answersChanged: changed,
        attemptsAffected: touched.size,
        skipped,
      };
    });
  },

  /** Rescore history with old and new values (owner examiner or admin). */
  async rescoreHistory(user: SessionUser, id: string) {
    const exam = await readableExam(user, id);
    const runs = await query<{
      id: string;
      question_id: string;
      old_correct_ids: number[];
      new_correct_ids: number[];
      reason: string;
      attempts_affected: number;
      created_at: Date;
      rescored_by_name: string | null;
    }>(
      `SELECT r.id, r.question_id, r.old_correct_ids, r.new_correct_ids, r.reason,
              r.attempts_affected, r.created_at, u.name AS rescored_by_name
       FROM exam_rescores r LEFT JOIN users u ON u.id = r.rescored_by
       WHERE r.exam_id = $1 ORDER BY r.created_at DESC`,
      [exam.id],
    );
    const answers = await query<{
      rescore_id: string;
      attempt_id: string;
      old_score: number | null;
      new_score: number | null;
      old_total_score: number | null;
      new_total_score: number | null;
    }>(
      `SELECT ar.rescore_id, ar.attempt_id, ar.old_score, ar.new_score,
              ar.old_total_score, ar.new_total_score
       FROM answer_rescores ar JOIN exam_rescores r ON r.id = ar.rescore_id
       WHERE r.exam_id = $1 ORDER BY ar.id`,
      [exam.id],
    );
    return runs.map((r) => ({
      id: r.id,
      questionId: r.question_id,
      oldCorrectIds: r.old_correct_ids,
      newCorrectIds: r.new_correct_ids,
      reason: r.reason,
      attemptsAffected: r.attempts_affected,
      rescoredBy: r.rescored_by_name,
      createdAt: r.created_at.toISOString(),
      changes: answers
        .filter((a) => a.rescore_id === r.id)
        .map((a) => ({
          attemptId: a.attempt_id,
          oldScore: a.old_score === null ? null : Number(a.old_score),
          newScore: a.new_score === null ? null : Number(a.new_score),
          oldTotalScore:
            a.old_total_score === null ? null : Number(a.old_total_score),
          newTotalScore:
            a.new_total_score === null ? null : Number(a.new_total_score),
        })),
    }));
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
