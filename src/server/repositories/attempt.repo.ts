import "server-only";
import type { PoolClient } from "pg";
import { query } from "../db";
import type { SnapshotOption } from "../exam/scoring";
import type {
  AttemptStatus,
  GradingStatus,
  SavedAnswer,
  SubmitReason,
} from "@/shared/schemas/attempt";
import type { MultiScoring, Phase } from "@/shared/schemas/exam";
import type { QuestionType } from "@/shared/schemas/question";

export type AttemptRow = {
  id: string;
  exam_id: string;
  candidate_id: string;
  is_sandbox: boolean;
  seed: number;
  status: AttemptStatus;
  grading_status: GradingStatus;
  started_at: Date;
  deadline_at: Date;
  submitted_at: Date | null;
  submit_reason: SubmitReason | null;
  total_score: number | null;
  multi_scoring: MultiScoring;
  negative_marking: number;
  show_answers: boolean;
  recovery_window_seconds: number;
  last_seen_at: Date;
  scratchpad: string;
  receipt_code: string;
  server_now: Date;
  exam_title: string;
  exam_instructions: string;
  exam_status: "DRAFT" | "PUBLISHED" | "CLOSED";
  exam_cancelled: boolean;
  duration_minutes: number | null;
  instructions_snapshot: string | null;
};

export type AttemptQuestionRow = {
  id: string;
  attempt_id: string;
  position: number;
  question_id: string;
  type: QuestionType;
  body: string;
  marks: number;
  options: SnapshotOption[];
};

const ATTEMPT_SELECT = `
  SELECT a.*, now() AS server_now, e.title AS exam_title,
         COALESCE(a.instructions_snapshot, e.instructions) AS exam_instructions,
         e.status AS exam_status, e.cancelled AS exam_cancelled
  FROM attempts a
  JOIN exams e ON e.id = a.exam_id
`;

export const attemptRepo = {
  async listCandidateExams(candidateId: string) {
    const rows = await query<{
      exam_id: string;
      title: string;
      instructions: string;
      starts_at: Date;
      ends_at: Date;
      duration_minutes: number;
      status: string;
      phase: Phase;
      results_published_at: Date | null;
      content_changed_at: Date | null;
      cancelled: boolean;
      close_reason: string | null;
      question_count: number;
      total_marks: number;
      attempt_id: string | null;
      attempt_status: AttemptStatus | null;
      grading_status: GradingStatus | null;
      deadline_at: Date | null;
      submitted_at: Date | null;
      total_score: number | null;
      receipt_code: string | null;
      server_now: Date;
    }>(
      `SELECT e.id AS exam_id, e.title, e.instructions, e.starts_at, e.ends_at,
              e.duration_minutes, e.status, e.results_published_at, now() AS server_now,
              e.content_changed_at, e.cancelled, e.close_reason,
              CASE
                WHEN e.status = 'DRAFT' THEN 'DRAFT'
                WHEN e.status = 'CLOSED' OR now() > e.ends_at THEN 'COMPLETED'
                WHEN now() < e.starts_at THEN 'UPCOMING'
                ELSE 'ONGOING'
              END AS phase,
              COALESCE(eq.question_count, 0)::int AS question_count,
              COALESCE(eq.total_marks, 0)::numeric AS total_marks,
              a.id AS attempt_id, a.status AS attempt_status, a.grading_status,
              a.deadline_at, a.submitted_at, a.total_score,
              CASE WHEN a.status = 'SUBMITTED' THEN a.receipt_code END AS receipt_code
       FROM enrollments en
       JOIN exams e ON e.id = en.exam_id
       LEFT JOIN (
         SELECT exam_id, COUNT(*)::int AS question_count, SUM(marks) AS total_marks
         FROM exam_questions GROUP BY exam_id
       ) eq ON eq.exam_id = e.id
       LEFT JOIN real_attempts a ON a.exam_id = e.id AND a.candidate_id = en.candidate_id
       WHERE en.candidate_id = $1 AND e.status <> 'DRAFT'
       ORDER BY e.starts_at DESC`,
      [candidateId],
    );
    return rows;
  },

  async findForCandidate(
    attemptId: string,
    candidateId: string,
  ): Promise<AttemptRow | null> {
    const rows = await query<AttemptRow>(
      `${ATTEMPT_SELECT} WHERE a.id = $1 AND a.candidate_id = $2`,
      [attemptId, candidateId],
    );
    return rows[0] ?? null;
  },

  async findByIdForUpdate(
    c: PoolClient,
    attemptId: string,
  ): Promise<AttemptRow | null> {
    const r = await c.query<AttemptRow>(
      `SELECT a.*, now() AS server_now, e.title AS exam_title,
              COALESCE(a.instructions_snapshot, e.instructions) AS exam_instructions,
              e.status AS exam_status, e.cancelled AS exam_cancelled
       FROM attempts a JOIN exams e ON e.id = a.exam_id
       WHERE a.id = $1 FOR UPDATE OF a`,
      [attemptId],
    );
    return r.rows[0] ?? null;
  },

  async findRealByExamAndCandidate(
    c: PoolClient,
    examId: string,
    candidateId: string,
  ) {
    const r = await c.query<AttemptRow>(
      `${ATTEMPT_SELECT} WHERE a.exam_id = $1 AND a.candidate_id = $2 AND NOT a.is_sandbox`,
      [examId, candidateId],
    );
    return r.rows[0] ?? null;
  },

  async getQuestions(
    attemptId: string,
    c?: PoolClient,
  ): Promise<AttemptQuestionRow[]> {
    const sql = `SELECT id, attempt_id, position, question_id, type, body, marks, options
                 FROM attempt_questions WHERE attempt_id = $1 ORDER BY position`;
    const rows = c
      ? (await c.query<AttemptQuestionRow>(sql, [attemptId])).rows
      : await query<AttemptQuestionRow>(sql, [attemptId]);
    return rows.map((r) => ({ ...r, marks: Number(r.marks) }));
  },

  async getAnswers(attemptId: string, c?: PoolClient): Promise<SavedAnswer[]> {
    const sql = `SELECT attempt_question_id, selected_option_ids, text_answer,
                        marked_for_review, seq, synced_late, saved_at
                 FROM answers WHERE attempt_id = $1`;
    const rows = c
      ? (
          await c.query<{
            attempt_question_id: string;
            selected_option_ids: number[];
            text_answer: string | null;
            marked_for_review: boolean;
            seq: number;
            synced_late: boolean;
            saved_at: Date;
          }>(sql, [attemptId])
        ).rows
      : await query<{
          attempt_question_id: string;
          selected_option_ids: number[];
          text_answer: string | null;
          marked_for_review: boolean;
          seq: number;
          synced_late: boolean;
          saved_at: Date;
        }>(sql, [attemptId]);
    return rows.map((r) => ({
      attemptQuestionId: r.attempt_question_id,
      selectedOptionIds: r.selected_option_ids ?? [],
      textAnswer: r.text_answer,
      markedForReview: r.marked_for_review,
      seq: r.seq,
      syncedLate: r.synced_late,
      savedAt: r.saved_at.toISOString(),
    }));
  },

  async loadExamQuestionsWithOptions(c: PoolClient, examId: string) {
    const qs = (
      await c.query<{
        question_id: string;
        position: number;
        marks: number;
        type: QuestionType;
        body: string;
      }>(
        `SELECT eq.question_id, eq.position, eq.marks, q.type, q.body
         FROM exam_questions eq
         JOIN questions q ON q.id = eq.question_id
         WHERE eq.exam_id = $1 ORDER BY eq.position`,
        [examId],
      )
    ).rows;
    const qIds = qs.map((q) => q.question_id);
    const opts =
      qIds.length === 0
        ? []
        : (
            await c.query<{
              id: number;
              question_id: string;
              body: string;
              is_correct: boolean;
              position: number;
            }>(
              `SELECT id, question_id, body, is_correct, position
               FROM question_options WHERE question_id = ANY($1::uuid[])
               ORDER BY question_id, position`,
              [qIds],
            )
          ).rows;
    const byQ = new Map<string, SnapshotOption[]>();
    for (const o of opts) {
      const list = byQ.get(o.question_id) ?? [];
      list.push({
        id: o.id,
        body: o.body,
        isCorrect: o.is_correct,
        position: o.position,
      });
      byQ.set(o.question_id, list);
    }
    return qs.map((q) => ({
      questionId: q.question_id,
      marks: Number(q.marks),
      type: q.type,
      body: q.body,
      options: byQ.get(q.question_id) ?? [],
    }));
  },

  async recomputeTotalScore(c: PoolClient, attemptId: string) {
    const r = await c.query<{ total: number }>(
      `UPDATE attempts a
       SET total_score = GREATEST(0, COALESCE((
         SELECT SUM(ans.score) FROM answers ans WHERE ans.attempt_id = a.id
       ), 0))
       WHERE a.id = $1
       RETURNING total_score AS total`,
      [attemptId],
    );
    return Number(r.rows[0].total);
  },
};
