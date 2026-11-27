import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import QRCode from "qrcode";
import { query, tx } from "../db";
import { Errors, assertUuid } from "../http";
import { examRepo } from "../repositories/exam.repo";
import { attemptRepo } from "../repositories/attempt.repo";
import { populateSnapshotInTx } from "./attempt.service";
import { gradingService } from "./grading.service";
import {
  renderCandidateResultPdf,
  renderExamSummaryPdf,
} from "../pdf/reports";
import {
  DEFAULT_PREFERENCES,
  preferencesSchema,
  type ExamAnalyticsResponse,
  type QuestionAnalyticsItem,
  type VerificationPublic,
  type WorkspacePreferences,
} from "@/shared/schemas/secondary";
import type { SessionUser } from "@/shared/schemas/auth";
import type { Difficulty, QuestionType } from "@/shared/schemas/question";
import type { SnapshotOption } from "../exam/scoring";

function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C.";
  return parts.map((p) => `${p[0].toUpperCase()}.`).join(" ");
}

function scoreBand(pct: number): string {
  if (pct >= 85) return "Distinction";
  if (pct >= 70) return "Merit";
  if (pct >= 50) return "Pass";
  return "Below Pass";
}

function generateVerifyCode(): string {
  // 16 uppercase alphanumeric chars (~80 bits of entropy)
  return randomBytes(10).toString("hex").toUpperCase().slice(0, 16);
}

function observedFromPct(pct: number): Difficulty {
  if (pct >= 75) return "EASY";
  if (pct >= 40) return "MEDIUM";
  return "HARD";
}

export const secondaryService = {
  /** Workspace preferences stored server-side on users.preferences. */
  async getPreferences(userId: string): Promise<WorkspacePreferences> {
    const rows = await query<{ preferences: unknown }>(
      "SELECT preferences FROM users WHERE id = $1",
      [userId],
    );
    const parsed = preferencesSchema.safeParse(rows[0]?.preferences ?? {});
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
  },

  async updatePreferences(
    userId: string,
    patch: Partial<WorkspacePreferences>,
  ): Promise<WorkspacePreferences> {
    const current = await this.getPreferences(userId);
    const merged = preferencesSchema.parse({ ...current, ...patch });
    await query("UPDATE users SET preferences = $2::jsonb WHERE id = $1", [
      userId,
      JSON.stringify(merged),
    ]);
    return merged;
  },

  /** Private candidate scratchpad autosaved to attempts.scratchpad (never graded). */
  async saveScratchpad(
    user: SessionUser,
    attemptIdRaw: string,
    scratchpad: string,
  ) {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");
    if (owned.status !== "IN_PROGRESS") {
      throw Errors.conflict("Attempt is closed.");
    }
    await query(
      "UPDATE attempts SET scratchpad = $2, last_seen_at = now() WHERE id = $1",
      [attemptId, scratchpad],
    );
    return { saved: true };
  },

  /** Examiner sandbox ("Preview as candidate"): bypasses window/enrollment, never counted anywhere. */
  async startSandbox(
    user: SessionUser,
    examIdRaw: string,
    reset = false,
  ): Promise<{ attemptId: string }> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const examId = assertUuid(examIdRaw, "Exam");
    const exam = await examRepo.findById(examId, user.id);
    if (!exam) throw Errors.notFound("Exam not found");
    if (exam.questionCount < 1) {
      throw Errors.conflict("Add at least 1 question before previewing.");
    }

    return tx(async (c) => {
      if (reset) {
        await c.query(
          "DELETE FROM attempts WHERE exam_id = $1 AND candidate_id = $2 AND is_sandbox",
          [exam.id, user.id],
        );
      } else {
        const existing = await c.query<{ id: string; status: string }>(
          "SELECT id, status FROM attempts WHERE exam_id = $1 AND candidate_id = $2 AND is_sandbox",
          [exam.id, user.id],
        );
        if (existing.rows[0] && existing.rows[0].status === "IN_PROGRESS") {
          return { attemptId: existing.rows[0].id };
        }
        if (existing.rows[0]) {
          await c.query("DELETE FROM attempts WHERE id = $1", [
            existing.rows[0].id,
          ]);
        }
      }

      const seed = randomInt(1, 2_147_483_647);
      const ins = await c.query<{ id: string }>(
        `INSERT INTO attempts (
           exam_id, candidate_id, is_sandbox, seed, deadline_at,
           multi_scoring, negative_marking, show_answers, recovery_window_seconds,
           duration_minutes, instructions_snapshot
         ) VALUES (
           $1, $2, true, $3, now() + ($4 || ' minutes')::interval,
           $5, $6, $7, $8, $9::int, $10
         ) RETURNING id`,
        [
          exam.id,
          user.id,
          seed,
          exam.durationMinutes,
          exam.multiScoring,
          exam.negativeMarking,
          exam.showAnswers,
          exam.recoveryWindowSeconds,
          exam.durationMinutes,
          exam.instructions,
        ],
      );
      const attemptId = ins.rows[0].id;
      await populateSnapshotInTx(
        c,
        attemptId,
        exam.id,
        seed,
        exam.shuffleQuestions,
        exam.shuffleOptions,
      );
      return { attemptId };
    });
  },

  /** Question analytics strictly from real_attempts (excludes sandboxes). */
  async getExamAnalytics(
    user: SessionUser,
    examIdRaw: string,
  ): Promise<ExamAnalyticsResponse> {
    const examId = assertUuid(examIdRaw, "Exam");
    const ownerId = user.role === "ADMIN" ? undefined : user.id;
    const exam = await examRepo.findById(examId, ownerId);
    if (!exam) throw Errors.notFound("Exam not found");

    const [statsRow] = await query<{
      submitted: number;
      avg_score: number | null;
      max_score: number | null;
      min_score: number | null;
    }>(
      `SELECT count(*)::int AS submitted,
              ROUND(AVG(total_score)::numeric, 2) AS avg_score,
              MAX(total_score) AS max_score,
              MIN(total_score) AS min_score
       FROM real_attempts
       WHERE exam_id = $1 AND status = 'SUBMITTED'`,
      [exam.id],
    );

    const examQs = await query<{
      question_id: string;
      position: number;
      marks: number;
      body: string;
      type: QuestionType;
      difficulty: Difficulty;
      topic_name: string;
    }>(
      `SELECT eq.question_id, eq.position, eq.marks, q.body, q.type, q.difficulty, t.name AS topic_name
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       JOIN topics t ON t.id = q.topic_id
       WHERE eq.exam_id = $1
       ORDER BY eq.position`,
      [exam.id],
    );

    const snapRows = await query<{
      question_id: string;
      marks: number;
      options: SnapshotOption[];
      selected_option_ids: number[] | null;
      text_answer: string | null;
      score: number | null;
    }>(
      `SELECT aq.question_id, aq.marks, aq.options,
              ans.selected_option_ids, ans.text_answer, ans.score
       FROM real_attempts a
       JOIN attempt_questions aq ON aq.attempt_id = a.id
       LEFT JOIN answers ans ON ans.attempt_question_id = aq.id
       WHERE a.exam_id = $1 AND a.status = 'SUBMITTED'`,
      [exam.id],
    );

    const byQ = new Map<string, typeof snapRows>();
    for (const r of snapRows) {
      const list = byQ.get(r.question_id) ?? [];
      list.push(r);
      byQ.set(r.question_id, list);
    }

    const questions: QuestionAnalyticsItem[] = examQs.map((q) => {
      const rows = byQ.get(q.question_id) ?? [];
      const attempts = rows.length;
      const marks = Number(q.marks);

      let skipped = 0;
      let fullCorrect = 0;
      let scorePctSum = 0;
      let scoredCount = 0;
      const optCounts = new Map<
        number,
        { body: string; isCorrect: boolean; count: number }
      >();

      for (const r of rows) {
        const picked = r.selected_option_ids ?? [];
        const hasText = !!r.text_answer && r.text_answer.trim().length > 0;
        if (q.type === "WRITTEN" ? !hasText : picked.length === 0) skipped++;
        if (r.score !== null) {
          scoredCount++;
          const s = Number(r.score);
          scorePctSum += marks > 0 ? Math.max(0, s / marks) * 100 : 0;
          if (s >= marks - 0.001) fullCorrect++;
        }
        for (const o of r.options) {
          if (!optCounts.has(o.id)) {
            optCounts.set(o.id, { body: o.body, isCorrect: o.isCorrect, count: 0 });
          }
        }
        for (const oid of picked) {
          const entry = optCounts.get(oid);
          if (entry) entry.count++;
        }
      }

      const skipRate =
        attempts > 0 ? Math.round((skipped / attempts) * 1000) / 10 : 0;
      const percentCorrect =
        attempts > 0 ? Math.round((fullCorrect / attempts) * 1000) / 10 : 0;
      const avgScorePct =
        scoredCount > 0 ? Math.round((scorePctSum / scoredCount) * 10) / 10 : 0;

      const observedDifficulty =
        attempts > 0 ? observedFromPct(avgScorePct) : null;
      const difficultyMismatch =
        observedDifficulty !== null && observedDifficulty !== q.difficulty;

      const optionDistribution = [...optCounts.entries()].map(
        ([optionId, v]) => ({
          optionId,
          body: v.body,
          isCorrect: v.isCorrect,
          count: v.count,
          percent:
            attempts > 0 ? Math.round((v.count / attempts) * 1000) / 10 : 0,
        }),
      );
      const wrongSorted = optionDistribution
        .filter((o) => !o.isCorrect && o.count > 0)
        .sort((a, b) => b.count - a.count);

      return {
        questionId: q.question_id,
        position: q.position,
        body: q.body,
        topicName: q.topic_name,
        type: q.type,
        declaredDifficulty: q.difficulty,
        observedDifficulty,
        difficultyMismatch,
        marks,
        attempts,
        skipRate,
        percentCorrect,
        avgScorePct,
        mostCommonWrong: wrongSorted[0]?.body ?? null,
        optionDistribution,
      };
    });

    return {
      examId: exam.id,
      examTitle: exam.title,
      submittedAttempts: statsRow.submitted,
      averageScore:
        statsRow.avg_score !== null ? Number(statsRow.avg_score) : null,
      highestScore:
        statsRow.max_score !== null ? Number(statsRow.max_score) : null,
      lowestScore:
        statsRow.min_score !== null ? Number(statsRow.min_score) : null,
      totalMarks: exam.totalMarks,
      questions,
    };
  },

  /** Public verification lookup by code (no email, no user/attempt IDs). */
  async verifyReportCode(code: string): Promise<VerificationPublic> {
    const clean = code.trim().toUpperCase();
    const rows = await query<{
      code: string;
      issued_at: Date;
      score_at_issue: number;
      revoked: boolean;
      exam_cancelled: boolean;
      current_score: number | null;
      exam_title: string;
      candidate_name: string;
      total_marks: number;
    }>(
      `SELECT rv.code, rv.issued_at, rv.score_at_issue, rv.revoked,
              e.cancelled AS exam_cancelled,
              a.total_score AS current_score, e.title AS exam_title,
              u.name AS candidate_name,
              COALESCE((SELECT SUM(marks) FROM attempt_questions WHERE attempt_id = a.id), 0)::numeric AS total_marks
       FROM report_verifications rv
       JOIN real_attempts a ON a.id = rv.attempt_id
       JOIN exams e ON e.id = a.exam_id
       JOIN users u ON u.id = a.candidate_id
       WHERE rv.code = $1`,
      [clean],
    );
    const r = rows[0];
    if (!r) throw Errors.notFound("Verification code not found");

    const issuedScore = Number(r.score_at_issue);
    const currentScore =
      r.current_score !== null ? Number(r.current_score) : issuedScore;
    const totalMarks = Number(r.total_marks);
    const percentage =
      totalMarks > 0 ? Math.round((issuedScore / totalMarks) * 1000) / 10 : 0;

    let status: "VALID" | "REVOKED" | "SUPERSEDED" = "VALID";
    if (r.revoked || r.exam_cancelled) status = "REVOKED";
    else if (Math.abs(currentScore - issuedScore) > 0.001) status = "SUPERSEDED";

    return {
      code: r.code,
      status,
      examTitle: r.exam_title,
      maskedCandidateName: maskName(r.candidate_name),
      score: issuedScore,
      totalMarks,
      percentage,
      scoreBand: scoreBand(percentage),
      issuedAt: r.issued_at.toISOString(),
    };
  },

  /** Server-side PDF: Candidate Result Report with unique verification code & QR. */
  async buildCandidatePdf(
    user: SessionUser,
    attemptIdRaw: string,
    origin: string,
  ): Promise<{ buffer: Uint8Array; filename: string; code: string }> {
    const result = await gradingService.getCandidateResult(user, attemptIdRaw);

    // Issue or reuse an active verification code matching the current score.
    const existing = await query<{ code: string; score_at_issue: number }>(
      `SELECT code, score_at_issue FROM report_verifications
       WHERE attempt_id = $1 AND NOT revoked
       ORDER BY issued_at DESC LIMIT 1`,
      [result.attemptId],
    );
    let code: string;
    if (
      existing[0] &&
      Math.abs(Number(existing[0].score_at_issue) - result.totalScore) < 0.001
    ) {
      code = existing[0].code;
    } else {
      code = generateVerifyCode();
      await query(
        `INSERT INTO report_verifications (code, attempt_id, score_at_issue)
         VALUES ($1, $2, $3)`,
        [code, result.attemptId, result.totalScore],
      );
    }

    const verifyUrl = `${origin}/verify/${code}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 168,
    });
    const { buffer, filename } = renderCandidateResultPdf({
      result,
      code,
      verifyUrl,
      qrDataUrl,
    });
    return { buffer, filename, code };
  },

  /** Server-side PDF: Examiner Exam Summary Report (scores, per-question stats, extensions, real attempts only). */
  async buildExamSummaryPdf(
    user: SessionUser,
    examIdRaw: string,
  ): Promise<{ buffer: Uint8Array; filename: string }> {
    const [grading, analytics] = await Promise.all([
      gradingService.getExamGrading(user, examIdRaw),
      this.getExamAnalytics(user, examIdRaw),
    ]);
    const extRows = await query<{
      candidate_name: string;
      minutes: number;
      reason: string;
      granted_by_name: string;
      created_at: Date;
    }>(
      `SELECT cu.name AS candidate_name, te.minutes, te.reason,
              gu.name AS granted_by_name, te.created_at
       FROM time_extensions te
       JOIN real_attempts a ON a.id = te.attempt_id
       JOIN users cu ON cu.id = a.candidate_id
       JOIN users gu ON gu.id = te.granted_by
       WHERE a.exam_id = $1
       ORDER BY te.created_at DESC`,
      [analytics.examId],
    );
    return renderExamSummaryPdf({
      grading,
      analytics,
      extensions: extRows.map((e) => ({
        candidateName: e.candidate_name,
        minutes: e.minutes,
        reason: e.reason,
        grantedByName: e.granted_by_name,
        createdAt: e.created_at.toISOString(),
      })),
    });
  },
};
