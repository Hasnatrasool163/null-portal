import "server-only";
import { randomInt } from "node:crypto";
import type { PoolClient } from "pg";
import { tx } from "../db";
import { ApiError, Errors, assertUuid } from "../http";
import { createPrng, seededShuffle } from "../exam/prng";
import { scoreObjectiveAnswer } from "../exam/scoring";
import {
  attemptRepo,
  type AttemptQuestionRow,
  type AttemptRow,
} from "../repositories/attempt.repo";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  AccessStatus,
  AttemptState,
  GradingStatus,
  MyExamItem,
  SaveAnswerInput,
  SavedAnswer,
  SubmitReason,
  SubmitResult,
} from "@/shared/schemas/attempt";

const AUTOSAVE_GRACE_MS = 2000;

/**
 * Transitions an IN_PROGRESS attempt to SUBMITTED, auto-grades all objective questions
 * from the immutable snapshot, and recomputes total_score in one SQL statement.
 * Caller MUST hold FOR UPDATE lock on the attempt row inside `c`.
 */
export async function finalizeAttemptInTx(
  c: PoolClient,
  attempt: AttemptRow,
  reason: SubmitReason,
): Promise<AttemptRow> {
  if (attempt.status === "SUBMITTED") return attempt;

  const questions = await attemptRepo.getQuestions(attempt.id, c);
  const answers = await attemptRepo.getAnswers(attempt.id, c);
  const ansByAq = new Map(answers.map((a) => [a.attemptQuestionId, a]));

  let hasWritten = false;
  for (const q of questions) {
    if (q.type === "WRITTEN") {
      hasWritten = true;
      continue;
    }
    const existing = ansByAq.get(q.id);
    const score = scoreObjectiveAnswer({
      type: q.type,
      marks: q.marks,
      options: q.options,
      selectedOptionIds: existing?.selectedOptionIds ?? [],
      multiScoring: attempt.multi_scoring,
      negativeMarking: Number(attempt.negative_marking),
    });
    if (existing) {
      await c.query(
        "UPDATE answers SET score = $2 WHERE attempt_question_id = $1",
        [q.id, score],
      );
    } else {
      await c.query(
        `INSERT INTO answers (attempt_question_id, attempt_id, selected_option_ids, seq, score)
         VALUES ($1, $2, '{}', 0, $3)
         ON CONFLICT (attempt_question_id) DO UPDATE SET score = EXCLUDED.score`,
        [q.id, attempt.id, score],
      );
    }
  }

  const gradingStatus: GradingStatus = hasWritten
    ? "NEEDS_REVIEW"
    : "AUTO_GRADED";

  // For TIMEOUT we record the true cutoff (deadline_at), not the later discovery time.
  const submittedAtExpr =
    reason === "TIMEOUT" ? "deadline_at" : "LEAST(now(), deadline_at)";

  await c.query(
    `UPDATE attempts
     SET status = 'SUBMITTED',
         grading_status = $2,
         submitted_at = ${submittedAtExpr},
         submit_reason = $3
     WHERE id = $1`,
    [attempt.id, gradingStatus, reason],
  );
  await attemptRepo.recomputeTotalScore(c, attempt.id);
  return (await attemptRepo.findByIdForUpdate(c, attempt.id))!;
}

/** Lazily finalize an attempt if its deadline has passed (uses DB now()). */
export async function finalizeIfExpiredInTx(
  c: PoolClient,
  attempt: AttemptRow,
): Promise<AttemptRow> {
  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.server_now.getTime() > attempt.deadline_at.getTime()
  ) {
    return finalizeAttemptInTx(c, attempt, "TIMEOUT");
  }
  return attempt;
}

/** Public snapshot formatter: strips `isCorrect` so the answer key never leaks. */
function toAttemptState(
  attempt: AttemptRow,
  questions: AttemptQuestionRow[],
  answers: SavedAnswer[],
): AttemptState {
  return {
    id: attempt.id,
    examId: attempt.exam_id,
    examTitle: attempt.exam_title,
    instructions: attempt.exam_instructions,
    isSandbox: attempt.is_sandbox,
    status: attempt.status,
    gradingStatus: attempt.grading_status,
    startedAt: attempt.started_at.toISOString(),
    deadlineAt: attempt.deadline_at.toISOString(),
    submittedAt: attempt.submitted_at
      ? attempt.submitted_at.toISOString()
      : null,
    submitReason: attempt.submit_reason,
    serverNow: attempt.server_now.toISOString(),
    recoveryWindowSeconds: attempt.recovery_window_seconds,
    scratchpad: attempt.scratchpad,
    receiptCode: attempt.status === "SUBMITTED" ? attempt.receipt_code : null,
    questions: questions.map((q) => ({
      id: q.id,
      position: q.position,
      type: q.type,
      body: q.body,
      marks: q.marks,
      options: q.options.map((o) => ({
        id: o.id,
        body: o.body,
        position: o.position,
      })),
    })),
    answers,
  };
}

/** Creates the immutable question snapshot for a newly inserted attempt. */
export async function populateSnapshotInTx(
  c: PoolClient,
  attemptId: string,
  examId: string,
  seed: number,
  shuffleQuestions: boolean,
  shuffleOptions: boolean,
) {
  const rand = createPrng(seed);
  const raw = await attemptRepo.loadExamQuestionsWithOptions(c, examId);
  const ordered = shuffleQuestions ? seededShuffle(raw, rand) : raw;

  for (const [pos, q] of ordered.entries()) {
    const opts =
      shuffleOptions && q.options.length > 1
        ? seededShuffle(q.options, rand).map((o, idx) => ({
            ...o,
            position: idx,
          }))
        : q.options;
    await c.query(
      `INSERT INTO attempt_questions (attempt_id, position, question_id, type, body, marks, options)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        attemptId,
        pos,
        q.questionId,
        q.type,
        q.body,
        q.marks,
        JSON.stringify(opts),
      ],
    );
  }
}

export const attemptService = {
  /** Candidate home: all non-draft enrolled exams with derived access status. */
  async listMyExams(user: SessionUser): Promise<MyExamItem[]> {
    const rows = await attemptRepo.listCandidateExams(user.id);
    // Lazily finalize any expired IN_PROGRESS attempts before returning.
    const expiredIds = rows
      .filter(
        (r) =>
          r.attempt_id &&
          r.attempt_status === "IN_PROGRESS" &&
          r.deadline_at &&
          r.server_now.getTime() > r.deadline_at.getTime(),
      )
      .map((r) => r.attempt_id!);

    if (expiredIds.length > 0) {
      await tx(async (c) => {
        for (const id of expiredIds) {
          const a = await attemptRepo.findByIdForUpdate(c, id);
          if (a) await finalizeIfExpiredInTx(c, a);
        }
      });
    }

    const fresh =
      expiredIds.length > 0
        ? await attemptRepo.listCandidateExams(user.id)
        : rows;

    return fresh.map((r) => {
      const resultsPublished = !r.cancelled && r.results_published_at !== null;
      let accessStatus: AccessStatus;
      let accessReason: string;
      if (r.attempt_status === "SUBMITTED") {
        accessStatus = "SUBMITTED";
        accessReason = r.cancelled
          ? "Exam was cancelled"
          : resultsPublished
            ? "Submitted · Results published"
            : "Submitted · Results pending";
      } else if (r.attempt_status === "IN_PROGRESS") {
        accessStatus = "IN_PROGRESS";
        accessReason = "Attempt in progress";
      } else if (r.phase === "UPCOMING") {
        accessStatus = "UPCOMING";
        accessReason = "Exam window has not opened yet";
      } else if (r.phase === "COMPLETED") {
        accessStatus = "MISSED";
        accessReason =
          r.status === "CLOSED"
            ? r.cancelled
              ? "Exam was cancelled"
              : "Exam was closed by examiner"
            : "Exam window has ended";
      } else {
        accessStatus = "CAN_START";
        accessReason = "Available now";
      }
      return {
        examId: r.exam_id,
        title: r.title,
        instructions: r.instructions,
        startsAt: r.starts_at.toISOString(),
        endsAt: r.ends_at.toISOString(),
        durationMinutes: r.duration_minutes,
        phase: r.phase,
        questionCount: r.question_count,
        totalMarks: Number(r.total_marks),
        resultsPublished,
        accessStatus,
        accessReason,
        attemptId: r.attempt_id,
        attemptStatus: r.attempt_status,
        gradingStatus: r.grading_status,
        deadlineAt: r.deadline_at ? r.deadline_at.toISOString() : null,
        submittedAt: r.submitted_at ? r.submitted_at.toISOString() : null,
        // Never leak score before results are published.
        totalScore:
          resultsPublished && r.total_score !== null
            ? Number(r.total_score)
            : null,
        receiptCode: r.receipt_code,
        changedAt:
          r.attempt_id === null && r.content_changed_at
            ? r.content_changed_at.toISOString()
            : null,
        cancelReason: r.cancelled ? r.close_reason : null,
      };
    });
  },

  /** Start a new real attempt or resume an existing IN_PROGRESS one. Transactional + race-safe. */
  async startOrResume(
    user: SessionUser,
    examIdRaw: string,
  ): Promise<AttemptState> {
    const examId = assertUuid(examIdRaw, "Exam");

    return tx(async (c) => {
      const exRes = await c.query<{
        id: string;
        status: string;
        starts_at: Date;
        ends_at: Date;
        duration_minutes: number;
        shuffle_questions: boolean;
        shuffle_options: boolean;
        multi_scoring: string;
        negative_marking: number;
        show_answers: boolean;
        recovery_window_seconds: number;
        instructions: string;
        enrolled: boolean;
        server_now: Date;
      }>(
        `SELECT e.id, e.status, e.starts_at, e.ends_at, e.duration_minutes,
                e.shuffle_questions, e.shuffle_options, e.multi_scoring,
                e.negative_marking, e.show_answers, e.recovery_window_seconds,
                e.instructions, now() AS server_now,
                EXISTS (
                  SELECT 1 FROM enrollments en
                  WHERE en.exam_id = e.id AND en.candidate_id = $2
                ) AS enrolled
         FROM exams e
         WHERE e.id = $1
         FOR SHARE OF e`,
        [examId, user.id],
      );
      const ex = exRes.rows[0];
      if (!ex || ex.status === "DRAFT" || !ex.enrolled) {
        throw Errors.notFound("Exam not found");
      }

      // Check existing attempt first (resume or 409 if already submitted).
      const existing = await attemptRepo.findRealByExamAndCandidate(
        c,
        examId,
        user.id,
      );
      if (existing) {
        const locked = (await attemptRepo.findByIdForUpdate(c, existing.id))!;
        const checked = await finalizeIfExpiredInTx(c, locked);
        if (checked.status === "SUBMITTED") {
          throw Errors.conflict("You have already submitted this exam.");
        }
        const [qs, ans] = await Promise.all([
          attemptRepo.getQuestions(checked.id, c),
          attemptRepo.getAnswers(checked.id, c),
        ]);
        return toAttemptState(checked, qs, ans);
      }

      // New attempt: exam must be PUBLISHED and DB now() inside [starts_at, ends_at].
      if (ex.status !== "PUBLISHED") {
        throw Errors.conflict("This exam is closed.");
      }
      if (ex.server_now.getTime() < ex.starts_at.getTime()) {
        throw Errors.conflict("This exam has not started yet.");
      }
      if (ex.server_now.getTime() >= ex.ends_at.getTime()) {
        throw Errors.conflict("The exam window has already ended.");
      }

      const seed = randomInt(1, 2_147_483_647);
      const ins = await c.query<{ id: string }>(
        `INSERT INTO attempts (
           exam_id, candidate_id, is_sandbox, seed, deadline_at,
           multi_scoring, negative_marking, show_answers, recovery_window_seconds,
           duration_minutes, instructions_snapshot
         ) VALUES (
           $1, $2, false, $3,
           LEAST(now() + ($4 || ' minutes')::interval, $5::timestamptz),
           $6, $7, $8, $9, $10::int, $11
         )
         ON CONFLICT (exam_id, candidate_id) WHERE NOT is_sandbox DO NOTHING
         RETURNING id`,
        [
          examId,
          user.id,
          seed,
          ex.duration_minutes,
          ex.ends_at.toISOString(),
          ex.multi_scoring,
          ex.negative_marking,
          ex.show_answers,
          ex.recovery_window_seconds,
          ex.duration_minutes,
          ex.instructions,
        ],
      );

      let attemptId: string;
      if (ins.rows[0]) {
        attemptId = ins.rows[0].id;
        await populateSnapshotInTx(
          c,
          attemptId,
          examId,
          seed,
          ex.shuffle_questions,
          ex.shuffle_options,
        );
      } else {
        // Concurrent double-click race: fetch the winning attempt.
        const raced = await attemptRepo.findRealByExamAndCandidate(
          c,
          examId,
          user.id,
        );
        if (!raced) throw Errors.conflict("Could not start attempt");
        if (raced.status === "SUBMITTED") {
          throw Errors.conflict("You have already submitted this exam.");
        }
        attemptId = raced.id;
      }

      const attempt = (await attemptRepo.findByIdForUpdate(c, attemptId))!;
      const [qs, ans] = await Promise.all([
        attemptRepo.getQuestions(attemptId, c),
        attemptRepo.getAnswers(attemptId, c),
      ]);
      return toAttemptState(attempt, qs, ans);
    });
  },

  /** Fetch current attempt state (works on refresh or another device). */
  async getState(
    user: SessionUser,
    attemptIdRaw: string,
  ): Promise<AttemptState> {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");

    return tx(async (c) => {
      const locked = (await attemptRepo.findByIdForUpdate(c, attemptId))!;
      const checked = await finalizeIfExpiredInTx(c, locked);
      const [qs, ans] = await Promise.all([
        attemptRepo.getQuestions(checked.id, c),
        attemptRepo.getAnswers(checked.id, c),
      ]);
      return toAttemptState(checked, qs, ans);
    });
  },

  /** Idempotent autosave with monotonic `seq`, snapshot validation, and 2s in-flight grace. */
  async saveAnswer(
    user: SessionUser,
    attemptIdRaw: string,
    input: SaveAnswerInput,
  ) {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");

    return tx(async (c) => {
      const locked = (await attemptRepo.findByIdForUpdate(c, attemptId))!;
      const examClosed =
        !locked.is_sandbox &&
        (locked.exam_status === "CLOSED" || locked.exam_cancelled);
      if (
        examClosed ||
        locked.status !== "IN_PROGRESS" ||
        locked.server_now.getTime() >
          locked.deadline_at.getTime() + AUTOSAVE_GRACE_MS
      ) {
        if (examClosed && locked.status === "IN_PROGRESS") {
          await finalizeAttemptInTx(c, locked, "EXAMINER");
        } else {
          await finalizeIfExpiredInTx(c, locked);
        }
        throw new ApiError(
          409,
          "ATTEMPT_CLOSED",
          locked.exam_cancelled
            ? "This exam has been cancelled and can no longer accept answers."
            : examClosed
              ? "This exam has been closed and can no longer accept answers."
              : "This attempt is closed and can no longer accept answers.",
        );
      }

      // Validate attemptQuestionId belongs to this attempt and options belong to its snapshot.
      const aqRes = await c.query<AttemptQuestionRow>(
        "SELECT * FROM attempt_questions WHERE id = $1 AND attempt_id = $2",
        [input.attemptQuestionId, attemptId],
      );
      const aq = aqRes.rows[0];
      if (!aq) throw Errors.notFound("Question not found in this attempt");

      const validOptionIds = new Set(aq.options.map((o) => o.id));
      let selected: number[] = [];
      let textAnswer: string | null = null;

      if (aq.type === "WRITTEN") {
        if (input.selectedOptionIds && input.selectedOptionIds.length > 0) {
          throw Errors.badRequest("Written questions do not accept options.");
        }
        textAnswer = input.textAnswer ?? null;
      } else {
        selected = [...new Set(input.selectedOptionIds ?? [])];
        if (aq.type === "MCQ_SINGLE" && selected.length > 1) {
          throw Errors.badRequest(
            "Single-choice questions allow at most one selected option.",
          );
        }
        for (const oid of selected) {
          if (!validOptionIds.has(oid)) {
            throw Errors.badRequest("Invalid option selected.");
          }
        }
      }

      const existing = (
        await c.query<{ seq: number }>(
          "SELECT seq FROM answers WHERE attempt_question_id = $1",
          [aq.id],
        )
      ).rows[0];

      await c.query("UPDATE attempts SET last_seen_at = now() WHERE id = $1", [
        attemptId,
      ]);

      // Ignore stale writes (idempotent).
      if (existing && input.seq <= existing.seq) {
        return { accepted: false, seq: existing.seq, stale: true };
      }

      const marked = input.markedForReview ?? false;
      await c.query(
        `INSERT INTO answers (
           attempt_question_id, attempt_id, selected_option_ids, text_answer,
           marked_for_review, seq, saved_at
         ) VALUES ($1, $2, $3::int[], $4, $5, $6, now())
         ON CONFLICT (attempt_question_id) DO UPDATE SET
           selected_option_ids = EXCLUDED.selected_option_ids,
           text_answer = EXCLUDED.text_answer,
           marked_for_review = EXCLUDED.marked_for_review,
           seq = EXCLUDED.seq,
           saved_at = now()
         WHERE answers.seq < EXCLUDED.seq`,
        [aq.id, attemptId, selected, textAnswer, marked, input.seq],
      );

      return { accepted: true, seq: input.seq, stale: false };
    });
  },

  /** Idempotent submit: second call returns the same result without regrading. */
  async submit(user: SessionUser, attemptIdRaw: string): Promise<SubmitResult> {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");

    return tx(async (c) => {
      const locked = (await attemptRepo.findByIdForUpdate(c, attemptId))!;
      const reason: SubmitReason =
        locked.server_now.getTime() > locked.deadline_at.getTime()
          ? "TIMEOUT"
          : "USER";
      const done =
        locked.status === "SUBMITTED"
          ? locked
          : await finalizeAttemptInTx(c, locked, reason);

      const [qs, ans] = await Promise.all([
        attemptRepo.getQuestions(done.id, c),
        attemptRepo.getAnswers(done.id, c),
      ]);
      const answeredCount = ans.filter(
        (a) =>
          a.selectedOptionIds.length > 0 ||
          (a.textAnswer !== null && a.textAnswer.trim().length > 0),
      ).length;

      return {
        attemptId: done.id,
        status: done.status,
        gradingStatus: done.grading_status,
        submittedAt: (done.submitted_at ?? done.server_now).toISOString(),
        submitReason: done.submit_reason ?? "USER",
        answeredCount,
        totalQuestions: qs.length,
        receiptCode: done.receipt_code,
      };
    });
  },
};
