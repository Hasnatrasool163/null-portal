import "server-only";
import type { PoolClient } from "pg";
import { query, tx } from "../db";
import { Errors, assertUuid } from "../http";
import { audit } from "../audit";
import { notifyResultsPublished, notifyScoreChanged } from "../notifications";
import { toCsv } from "../csv";
import { examRepo } from "../repositories/exam.repo";
import {
  attemptRepo,
  type AttemptQuestionRow,
} from "../repositories/attempt.repo";
import { finalizeIfExpiredInTx } from "./attempt.service";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  CandidateResultView,
  ExamGradingResponse,
  GradeAnswerInput,
  GradingAttemptSummary,
} from "@/shared/schemas/grading";
import type {
  AttemptStatus,
  GradingStatus,
  SubmitReason,
} from "@/shared/schemas/attempt";

/** Lazily finalize all expired IN_PROGRESS real attempts for an exam. */
export async function finalizeExpiredForExam(examId: string) {
  const expired = await query<{ id: string }>(
    `SELECT id FROM real_attempts
     WHERE exam_id = $1 AND status = 'IN_PROGRESS' AND now() > deadline_at`,
    [examId],
  );
  if (expired.length === 0) return;
  await tx(async (c) => {
    for (const row of expired) {
      const a = await attemptRepo.findByIdForUpdate(c, row.id);
      if (a) await finalizeIfExpiredInTx(c, a);
    }
  });
}

/**
 * Awards 0..question.marks (0.5 steps) to a WRITTEN answer inside the caller's transaction,
 * recomputes the attempt total and writes a GRADE_CHANGED audit row. Shared by normal grading
 * and dispute resolution (which passes its disputeId so the audit trail links the two).
 */
export async function gradeWrittenInTx(
  c: PoolClient,
  user: SessionUser,
  attemptId: string,
  aqId: string,
  input: GradeAnswerInput,
  opts: { disputeId?: string } = {},
) {
    const attempt = await attemptRepo.findByIdForUpdate(c, attemptId);
    if (!attempt || attempt.is_sandbox) {
      throw Errors.notFound("Attempt not found");
    }
    const examCheck = await c.query<{
      owner_id: string;
      results_published_at: Date | null;
    }>("SELECT owner_id, results_published_at FROM exams WHERE id = $1", [
      attempt.exam_id,
    ]);
    // Owner examiner always; an admin only when deciding an escalated dispute.
    const allowed =
      examCheck.rows[0] &&
      (examCheck.rows[0].owner_id === user.id ||
        (user.role === "ADMIN" && opts.disputeId !== undefined));
    if (!allowed) throw Errors.notFound("Attempt not found");

    const checked = await finalizeIfExpiredInTx(c, attempt);
    if (checked.status !== "SUBMITTED") {
      throw Errors.conflict(
        "Cannot grade an attempt that is still in progress.",
      );
    }

    const aqRes = await c.query<{
      id: string;
      type: string;
      marks: number;
      position: number;
      old_score: number | null;
      candidate_name: string;
    }>(
      `SELECT aq.id, aq.type, aq.marks, aq.position, ans.score AS old_score,
              u.name AS candidate_name
       FROM attempt_questions aq
       JOIN attempts a ON a.id = aq.attempt_id
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN answers ans ON ans.attempt_question_id = aq.id
       WHERE aq.id = $1 AND aq.attempt_id = $2`,
      [aqId, attemptId],
    );
    const aq = aqRes.rows[0];
    if (!aq) throw Errors.notFound("Question not found in this attempt");
    if (aq.type !== "WRITTEN") {
      throw Errors.badRequest("Only written questions are graded manually.");
    }
    const maxMarks = Number(aq.marks);
    if (input.score > maxMarks) {
      throw Errors.badRequest(
        `Score cannot exceed the question maximum (${maxMarks})`,
        { score: `Maximum is ${maxMarks}` },
      );
    }

    const prevTotal = (
      await c.query<{ total_score: number | null }>(
        "SELECT total_score FROM attempts WHERE id = $1",
        [attemptId],
      )
    ).rows[0]?.total_score;

    await c.query(
      `INSERT INTO answers (
         attempt_question_id, attempt_id, selected_option_ids, seq,
         score, graded_by, graded_at, feedback
       ) VALUES ($1, $2, '{}', 0, $3, $4, now(), $5)
       ON CONFLICT (attempt_question_id) DO UPDATE SET
         score = EXCLUDED.score,
         graded_by = EXCLUDED.graded_by,
         graded_at = EXCLUDED.graded_at,
         feedback = EXCLUDED.feedback`,
      [aq.id, attemptId, input.score, user.id, input.feedback ?? null],
    );

    // Recompute attempt total in one SQL statement (clamped >= 0).
    const totalScore = await attemptRepo.recomputeTotalScore(c, attemptId);

    const oldScore = aq.old_score !== null ? Number(aq.old_score) : null;
    if (oldScore !== input.score) {
      // After results are out the candidate hears about it. A dispute sends its own message,
      // but the certificate notice still applies.
      await notifyScoreChanged(
        c,
        attemptId,
        {
          from: prevTotal === null || prevTotal === undefined ? null : Number(prevTotal),
          to: Number(totalScore),
          reason: `Q${aq.position + 1} was regraded`,
        },
        { skipScoreNotice: opts.disputeId !== undefined },
      );
      await audit(c, user, {
        action: "GRADE_CHANGED",
        examId: attempt.exam_id,
        targetType: "attempt",
        targetId: attemptId,
        summary:
          oldScore === null
            ? `Graded Q${aq.position + 1} for ${aq.candidate_name}: ${input.score}/${maxMarks}`
            : `Changed Q${aq.position + 1} for ${aq.candidate_name}: ${oldScore} → ${input.score}/${maxMarks}`,
        details: {
          attemptQuestionId: aq.id,
          questionNumber: aq.position + 1,
          from: oldScore,
          to: input.score,
          maxMarks,
          afterResultsPublished:
            examCheck.rows[0].results_published_at !== null,
          ...(opts.disputeId ? { disputeId: opts.disputeId } : {}),
        },
      });
    }

    // Check if any written question in this attempt is still ungraded.
    const ungraded = (
      await c.query<{ n: number }>(
        `SELECT count(*)::int AS n
         FROM attempt_questions aq
         LEFT JOIN answers ans ON ans.attempt_question_id = aq.id
         WHERE aq.attempt_id = $1 AND aq.type = 'WRITTEN' AND ans.score IS NULL`,
        [attemptId],
      )
    ).rows[0].n;

    const gradingStatus: GradingStatus =
      ungraded === 0 ? "GRADED" : "NEEDS_REVIEW";
    await c.query("UPDATE attempts SET grading_status = $2 WHERE id = $1", [
      attemptId,
      gradingStatus,
    ]);

    return {
      attemptId,
      attemptQuestionId: aq.id,
      score: input.score,
      totalScore,
      gradingStatus,
    };
}

export const gradingService = {
  /** Examiner (own exam) or Admin (read-only) grading overview, excluding sandbox attempts. */
  async getExamGrading(
    user: SessionUser,
    examIdRaw: string,
  ): Promise<ExamGradingResponse> {
    const examId = assertUuid(examIdRaw, "Exam");
    const ownerId = user.role === "ADMIN" ? undefined : user.id;
    const exam = await examRepo.findById(examId, ownerId);
    if (!exam) throw Errors.notFound("Exam not found");

    await finalizeExpiredForExam(exam.id);

    const attemptRows = await query<{
      id: string;
      candidate_id: string;
      candidate_name: string;
      candidate_email: string;
      status: AttemptStatus;
      grading_status: GradingStatus;
      started_at: Date;
      deadline_at: Date;
      submitted_at: Date | null;
      submit_reason: SubmitReason | null;
      total_score: number | null;
    }>(
      `SELECT a.id, a.candidate_id, u.name AS candidate_name, u.email AS candidate_email,
              a.status, a.grading_status, a.started_at, a.deadline_at,
              a.submitted_at, a.submit_reason, a.total_score
       FROM real_attempts a
       JOIN users u ON u.id = a.candidate_id
       WHERE a.exam_id = $1
       ORDER BY a.submitted_at DESC NULLS LAST, a.started_at DESC`,
      [exam.id],
    );

    const attemptIds = attemptRows.map((a) => a.id);
    const aqRows =
      attemptIds.length === 0
        ? []
        : await query<
            AttemptQuestionRow & {
              answer_id: string | null;
              selected_option_ids: number[] | null;
              text_answer: string | null;
              score: number | null;
              feedback: string | null;
              synced_late: boolean | null;
            }
          >(
            `SELECT aq.id, aq.attempt_id, aq.position, aq.question_id, aq.type,
                    aq.body, aq.marks, aq.options,
                    ans.id AS answer_id, ans.selected_option_ids, ans.text_answer,
                    ans.score, ans.feedback, ans.synced_late
             FROM attempt_questions aq
             LEFT JOIN answers ans ON ans.attempt_question_id = aq.id
             WHERE aq.attempt_id = ANY($1::uuid[])
             ORDER BY aq.attempt_id, aq.position`,
            [attemptIds],
          );

    const byAttempt = new Map<string, typeof aqRows>();
    for (const r of aqRows) {
      const list = byAttempt.get(r.attempt_id) ?? [];
      list.push(r);
      byAttempt.set(r.attempt_id, list);
    }

    const attempts: GradingAttemptSummary[] = attemptRows.map((a) => {
      const qs = byAttempt.get(a.id) ?? [];
      const totalMarks = qs.reduce((s, q) => s + Number(q.marks), 0);
      const pendingWrittenCount = qs.filter(
        (q) => q.type === "WRITTEN" && q.score === null,
      ).length;
      const lateSyncCount = qs.filter((q) => q.synced_late === true).length;
      const scored = qs.filter((q) => q.score !== null);
      const rawScoreSum =
        scored.length > 0
          ? Math.round(scored.reduce((s, q) => s + Number(q.score), 0) * 100) /
            100
          : null;

      return {
        attemptId: a.id,
        candidateId: a.candidate_id,
        candidateName: a.candidate_name,
        candidateEmail: a.candidate_email,
        status: a.status,
        gradingStatus: a.grading_status,
        startedAt: a.started_at.toISOString(),
        deadlineAt: a.deadline_at.toISOString(),
        submittedAt: a.submitted_at ? a.submitted_at.toISOString() : null,
        submitReason: a.submit_reason,
        totalScore: a.total_score !== null ? Number(a.total_score) : null,
        rawScoreSum,
        totalMarks,
        pendingWrittenCount,
        lateSyncCount,
        answers: qs.map((q) => ({
          attemptQuestionId: q.id,
          questionId: q.question_id,
          position: q.position,
          type: q.type,
          body: q.body,
          marks: Number(q.marks),
          options: q.options,
          selectedOptionIds: q.selected_option_ids ?? [],
          textAnswer: q.text_answer,
          score: q.score !== null ? Number(q.score) : null,
          feedback: q.feedback,
          syncedLate: q.synced_late ?? false,
          answerId: q.answer_id,
        })),
      };
    });

    const submitted = attempts.filter((a) => a.status === "SUBMITTED");
    const needsReview = submitted.filter(
      (a) => a.gradingStatus === "NEEDS_REVIEW",
    );

    const inProgress = attempts.filter((a) => a.status === "IN_PROGRESS");
    const notAttempted = Math.max(0, exam.enrollmentCount - attempts.length);

    let publishBlockedReason: string | null = null;
    if (submitted.length === 0) {
      publishBlockedReason = "No submitted attempts to publish yet.";
    } else if (needsReview.length > 0) {
      publishBlockedReason = `${needsReview.length} submitted attempt(s) still have ungraded written answers. Grade them before publishing results.`;
    } else if (inProgress.length > 0) {
      publishBlockedReason = `${inProgress.length} candidate(s) are still taking the exam. Wait for them to submit (or close the exam) before publishing results.`;
    }

    return {
      examId: exam.id,
      examTitle: exam.title,
      resultsPublishedAt: exam.resultsPublishedAt,
      canPublishResults: publishBlockedReason === null,
      publishBlockedReason,
      pendingGradingCount: needsReview.length,
      inProgressCount: inProgress.length,
      notAttemptedCount: notAttempted,
      examWindowOpen: exam.phase !== "COMPLETED",
      attempts,
    };
  },

  /** Examiner awards 0..question.marks (0.5 steps) to a WRITTEN answer inside one transaction. */
  async gradeWrittenAnswer(
    user: SessionUser,
    attemptIdRaw: string,
    aqIdRaw: string,
    input: GradeAnswerInput,
  ) {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const aqId = assertUuid(aqIdRaw, "Question");
    return tx((c) => gradeWrittenInTx(c, user, attemptId, aqId, input));
  },


  /** Explicit per-exam results publish; blocked if any submitted attempt still needs review. */
  async publishResults(user: SessionUser, examIdRaw: string) {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const examId = assertUuid(examIdRaw, "Exam");
    const exam = await examRepo.findById(examId, user.id);
    if (!exam) throw Errors.notFound("Exam not found");
    if (exam.cancelled) {
      throw Errors.conflict("Cannot publish results for a cancelled exam.");
    }

    await finalizeExpiredForExam(exam.id);

    return tx(async (c) => {
      const counts = (
        await c.query<{ submitted: number; pending: number; in_progress: number }>(
          `SELECT count(*) FILTER (WHERE status = 'SUBMITTED')::int AS submitted,
                  count(*) FILTER (WHERE status = 'SUBMITTED' AND grading_status = 'NEEDS_REVIEW')::int AS pending,
                  count(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress
           FROM real_attempts
           WHERE exam_id = $1`,
          [exam.id],
        )
      ).rows[0];

      if (counts.submitted === 0) {
        throw Errors.conflict("No submitted attempts to publish yet.");
      }
      if (counts.pending > 0) {
        throw Errors.conflict(
          `${counts.pending} submitted attempt(s) still require written grading before publishing results.`,
        );
      }
      if (counts.in_progress > 0) {
        throw Errors.conflict(
          `${counts.in_progress} candidate(s) are still taking the exam. Wait for them to submit (or close the exam) before publishing results.`,
        );
      }

      const r = await c.query<{ results_published_at: Date }>(
        `UPDATE exams
         SET results_published_at = COALESCE(results_published_at, now()), updated_at = now()
         WHERE id = $1
         RETURNING results_published_at`,
        [exam.id],
      );
      if (!exam.resultsPublishedAt) {
        await notifyResultsPublished(c, exam.id);
        await audit(c, user, {
          action: "RESULTS_PUBLISHED",
          examId: exam.id,
          targetType: "exam",
          targetId: exam.id,
          summary: `Published results for "${exam.title}" (${counts.submitted} attempt(s))`,
          details: { submittedAttempts: counts.submitted },
        });
      }
      return {
        examId: exam.id,
        resultsPublishedAt: r.rows[0].results_published_at.toISOString(),
      };
    });
  },

  /** Results spreadsheet (every enrolled candidate, sandbox excluded). Formula-safe CSV. */
  async exportResultsCsv(user: SessionUser, examIdRaw: string) {
    const examId = assertUuid(examIdRaw, "Exam");
    const exam = await examRepo.findById(
      examId,
      user.role === "ADMIN" ? undefined : user.id,
    );
    if (!exam) throw Errors.notFound("Exam not found");
    await finalizeExpiredForExam(exam.id);

    const rows = await query<{
      name: string;
      email: string;
      status: string | null;
      grading_status: string | null;
      total_score: number | null;
      submitted_at: Date | null;
      submit_reason: string | null;
      receipt_code: string | null;
    }>(
      `SELECT u.name, u.email, a.status, a.grading_status, a.total_score,
              a.submitted_at, a.submit_reason,
              CASE WHEN a.status = 'SUBMITTED' THEN a.receipt_code END AS receipt_code
       FROM enrollments en
       JOIN users u ON u.id = en.candidate_id
       LEFT JOIN real_attempts a ON a.exam_id = en.exam_id AND a.candidate_id = en.candidate_id
       WHERE en.exam_id = $1
       ORDER BY lower(u.name), u.email`,
      [exam.id],
    );
    const total = Number(exam.totalMarks);
    const csv = toCsv(
      [
        "Candidate",
        "Email",
        "Attempt status",
        "Grading status",
        "Score",
        "Total marks",
        "Percentage",
        "Submitted at (UTC)",
        "Submit reason",
        "Receipt code",
      ],
      rows.map((r) => {
        const score = r.total_score !== null ? Number(r.total_score) : null;
        return [
          r.name,
          r.email,
          r.status ?? "NOT_STARTED",
          r.grading_status ?? "",
          score,
          total,
          score !== null && total > 0
            ? Math.round((score / total) * 10000) / 100
            : null,
          r.submitted_at ? r.submitted_at.toISOString() : "",
          r.submit_reason ?? "",
          r.receipt_code ?? "",
        ];
      }),
    );
    const safeName =
      exam.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "exam";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-results.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  },

  /** Candidate views own published result (never sees others' or unpublished results). */
  async getCandidateResult(
    user: SessionUser,
    attemptIdRaw: string,
  ): Promise<CandidateResultView> {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const rows = await query<{
      id: string;
      exam_id: string;
      exam_title: string;
      owner_id: string;
      candidate_id: string;
      candidate_name: string;
      is_sandbox: boolean;
      status: AttemptStatus;
      grading_status: GradingStatus;
      submitted_at: Date | null;
      submit_reason: SubmitReason | null;
      total_score: number | null;
      show_answers: boolean;
      results_published_at: Date | null;
      exam_cancelled: boolean;
    }>(
      `SELECT a.id, a.exam_id, e.title AS exam_title, e.owner_id,
              a.candidate_id, u.name AS candidate_name, a.is_sandbox,
              a.status, a.grading_status, a.submitted_at, a.submit_reason,
              a.total_score, a.show_answers, e.results_published_at,
              e.cancelled AS exam_cancelled
       FROM attempts a
       JOIN exams e ON e.id = a.exam_id
       JOIN users u ON u.id = a.candidate_id
       WHERE a.id = $1`,
      [attemptId],
    );
    const a = rows[0];
    if (!a || a.is_sandbox) throw Errors.notFound("Result not found");

    if (user.role === "CANDIDATE" && a.candidate_id !== user.id) {
      throw Errors.notFound("Result not found");
    }
    if (user.role === "EXAMINER" && a.owner_id !== user.id) {
      throw Errors.notFound("Result not found");
    }
    if (a.status !== "SUBMITTED") {
      throw Errors.conflict("This attempt has not been submitted yet.");
    }
    if (user.role === "CANDIDATE" && a.exam_cancelled) {
      throw Errors.forbidden(
        "This exam was cancelled and its results are not available.",
      );
    }
    if (user.role === "CANDIDATE" && !a.results_published_at) {
      throw Errors.forbidden(
        "Results for this exam have not been published yet.",
      );
    }

    const qs = await query<
      AttemptQuestionRow & {
        selected_option_ids: number[] | null;
        text_answer: string | null;
        score: number | null;
        feedback: string | null;
      }
    >(
      `SELECT aq.id, aq.attempt_id, aq.position, aq.question_id, aq.type,
              aq.body, aq.marks, aq.options,
              ans.selected_option_ids, ans.text_answer, ans.score, ans.feedback
       FROM attempt_questions aq
       LEFT JOIN answers ans ON ans.attempt_question_id = aq.id
       WHERE aq.attempt_id = $1
       ORDER BY aq.position`,
      [a.id],
    );

    const totalMarks = qs.reduce((s, q) => s + Number(q.marks), 0);
    const totalScore = a.total_score !== null ? Number(a.total_score) : 0;
    const percentage =
      totalMarks > 0 ? Math.round((totalScore / totalMarks) * 1000) / 10 : 0;
    const revealKey = user.role !== "CANDIDATE" || a.show_answers;

    return {
      attemptId: a.id,
      examId: a.exam_id,
      examTitle: a.exam_title,
      candidateName: a.candidate_name,
      submittedAt: (a.submitted_at ?? new Date()).toISOString(),
      submitReason: a.submit_reason,
      gradingStatus: a.grading_status,
      totalScore,
      totalMarks,
      percentage,
      showAnswers: a.show_answers,
      resultsPublishedAt: (a.results_published_at ?? new Date()).toISOString(),
      questions: qs.map((q) => ({
        attemptQuestionId: q.id,
        position: q.position,
        type: q.type,
        body: q.body,
        marks: Number(q.marks),
        options: q.options.map((o) =>
          revealKey
            ? {
                id: o.id,
                body: o.body,
                position: o.position,
                isCorrect: o.isCorrect,
              }
            : { id: o.id, body: o.body, position: o.position },
        ),
        selectedOptionIds: q.selected_option_ids ?? [],
        textAnswer: q.text_answer,
        score: q.score !== null ? Number(q.score) : null,
        feedback: q.feedback,
      })),
    };
  },
};
