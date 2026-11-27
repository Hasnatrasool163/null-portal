import "server-only";
import type { PoolClient } from "pg";
import { query } from "../db";
import type {
  ExamQuestionRow,
  ExamStatus,
  ExamSummary,
  ExamValues,
  MultiScoring,
  Phase,
} from "@/shared/schemas/exam";

type SummaryRow = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  instructions: string;
  starts_at: Date;
  ends_at: Date;
  duration_minutes: number;
  status: ExamStatus;
  phase: Phase;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  multi_scoring: MultiScoring;
  negative_marking: number;
  show_answers: boolean;
  recovery_window_seconds: number;
  results_published_at: Date | null;
  total_marks: number;
  question_count: number;
  enrollment_count: number;
  ends_in_future: boolean;
  created_at: Date;
  updated_at: Date;
  started_attempts: number;
  close_reason: string | null;
  cancelled: boolean;
  content_changed_at: Date | null;
};

/** Phase is always derived from stored status + PostgreSQL now() (never app server/client clock). */
const PHASE_SQL = `
  CASE
    WHEN e.status = 'DRAFT' THEN 'DRAFT'
    WHEN e.status = 'CLOSED' OR now() > e.ends_at THEN 'COMPLETED'
    WHEN now() < e.starts_at THEN 'UPCOMING'
    ELSE 'ONGOING'
  END
`;

const SUMMARY_SELECT = `
  SELECT e.id, e.owner_id, u.name AS owner_name, e.title, e.instructions,
         e.starts_at, e.ends_at, e.duration_minutes, e.status,
         ${PHASE_SQL} AS phase,
         e.shuffle_questions, e.shuffle_options, e.multi_scoring,
         e.negative_marking, e.show_answers, e.recovery_window_seconds,
         e.results_published_at, e.created_at, e.updated_at,
         e.close_reason, e.cancelled, e.content_changed_at,
         (SELECT count(*)::int FROM real_attempts ra WHERE ra.exam_id = e.id) AS started_attempts,
         (e.ends_at > now()) AS ends_in_future,
         COALESCE(eq.total_marks, 0)::numeric AS total_marks,
         COALESCE(eq.question_count, 0)::int AS question_count,
         COALESCE(en.enrollment_count, 0)::int AS enrollment_count
  FROM exams e
  JOIN users u ON u.id = e.owner_id
  LEFT JOIN (
    SELECT exam_id, SUM(marks) AS total_marks, COUNT(*)::int AS question_count
    FROM exam_questions
    GROUP BY exam_id
  ) eq ON eq.exam_id = e.id
  LEFT JOIN (
    SELECT exam_id, COUNT(*)::int AS enrollment_count
    FROM enrollments
    GROUP BY exam_id
  ) en ON en.exam_id = e.id
`;

const toSummary = (r: SummaryRow): ExamSummary => ({
  id: r.id,
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  title: r.title,
  instructions: r.instructions,
  startsAt: r.starts_at.toISOString(),
  endsAt: r.ends_at.toISOString(),
  durationMinutes: r.duration_minutes,
  status: r.status,
  phase: r.phase,
  shuffleQuestions: r.shuffle_questions,
  shuffleOptions: r.shuffle_options,
  multiScoring: r.multi_scoring,
  negativeMarking: Number(r.negative_marking),
  showAnswers: r.show_answers,
  recoveryWindowSeconds: r.recovery_window_seconds,
  resultsPublishedAt: r.results_published_at
    ? r.results_published_at.toISOString()
    : null,
  totalMarks: Number(r.total_marks),
  questionCount: r.question_count,
  enrollmentCount: r.enrollment_count,
  endsInFuture: r.ends_in_future,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
  startedAttempts: r.started_attempts,
  closeReason: r.close_reason,
  cancelled: r.cancelled,
  contentChangedAt: r.content_changed_at
    ? r.content_changed_at.toISOString()
    : null,
});

export const examRepo = {
  async list(opts: { ownerId?: string; q?: string; phase?: Phase }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.ownerId) {
      params.push(opts.ownerId);
      where.push(`e.owner_id = $${params.length}`);
    }
    if (opts.q) {
      params.push(`%${opts.q.replace(/[%_\\]/g, "\\$&")}%`);
      where.push(`e.title ILIKE $${params.length}`);
    }
    if (opts.phase) {
      params.push(opts.phase);
      where.push(`(${PHASE_SQL}) = $${params.length}`);
    }
    const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = await query<SummaryRow>(
      `${SUMMARY_SELECT} ${w} ORDER BY e.created_at DESC, e.id`,
      params,
    );
    return rows.map(toSummary);
  },

  /**
   * With `c` the read runs inside that transaction; with `lock` the exam row is locked
   * (FOR UPDATE) so phase checks and the write that follows cannot race an attempt start.
   */
  async findById(
    id: string,
    ownerId?: string,
    opts: { c?: PoolClient; lock?: boolean } = {},
  ): Promise<ExamSummary | null> {
    const params: unknown[] = [id];
    let filter = "WHERE e.id = $1";
    if (ownerId) {
      params.push(ownerId);
      filter += " AND e.owner_id = $2";
    }
    const sql = `${SUMMARY_SELECT} ${filter}${opts.lock ? " FOR UPDATE OF e" : ""}`;
    const rows = opts.c
      ? (await opts.c.query<SummaryRow>(sql, params)).rows
      : await query<SummaryRow>(sql, params);
    return rows[0] ? toSummary(rows[0]) : null;
  },

  /** Transactional exam write helper: run one UPDATE with a bumped updated_at. */
  async patchInTx(
    c: PoolClient,
    id: string,
    sets: Record<string, unknown>,
    opts: { contentChanged?: boolean } = {},
  ) {
    const cols = Object.keys(sets);
    const assigns = cols.map((k, i) => `${k} = $${i + 2}`);
    assigns.push("updated_at = now()");
    if (opts.contentChanged) assigns.push("content_changed_at = now()");
    await c.query(`UPDATE exams SET ${assigns.join(", ")} WHERE id = $1`, [
      id,
      ...cols.map((k) => sets[k]),
    ]);
  },

  async countOwnedOrAssignedQuestions(
    c: PoolClient,
    examId: string,
    ownerId: string,
    questionIds: string[],
  ): Promise<number> {
    if (questionIds.length === 0) return 0;
    const r = await c.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM questions q
       WHERE NOT q.archived AND q.id = ANY($2::uuid[])
         AND (q.owner_id = $1
              OR EXISTS (SELECT 1 FROM exam_questions eq
                         WHERE eq.exam_id = $3 AND eq.question_id = q.id))`,
      [ownerId, questionIds, examId],
    );
    return r.rows[0].n;
  },

  async listQuestions(examId: string): Promise<ExamQuestionRow[]> {
    const rows = await query<{
      question_id: string;
      position: number;
      marks: number;
      body: string;
      type: "MCQ_SINGLE" | "MCQ_MULTI" | "WRITTEN";
      difficulty: "EASY" | "MEDIUM" | "HARD";
      topic_name: string;
      archived: boolean;
    }>(
      `SELECT eq.question_id, eq.position, eq.marks, q.body, q.type, q.difficulty,
              t.name AS topic_name, q.archived
       FROM exam_questions eq
       JOIN questions q ON q.id = eq.question_id
       JOIN topics t ON t.id = q.topic_id
       WHERE eq.exam_id = $1
       ORDER BY eq.position`,
      [examId],
    );
    return rows.map((r) => ({
      questionId: r.question_id,
      position: r.position,
      marks: Number(r.marks),
      body: r.body,
      type: r.type,
      difficulty: r.difficulty,
      topicName: r.topic_name,
      archived: r.archived,
    }));
  },

  async create(ownerId: string, v: ExamValues): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO exams (
         owner_id, title, instructions, starts_at, ends_at, duration_minutes,
         shuffle_questions, shuffle_options, multi_scoring, negative_marking,
         show_answers, recovery_window_seconds
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        ownerId,
        v.title,
        v.instructions,
        v.startsAt,
        v.endsAt,
        v.durationMinutes,
        v.shuffleQuestions,
        v.shuffleOptions,
        v.multiScoring,
        v.negativeMarking,
        v.showAnswers,
        v.recoveryWindowSeconds,
      ],
    );
    return rows[0].id;
  },

  async updateDraft(id: string, v: ExamValues) {
    await query(
      `UPDATE exams SET
         title=$2, instructions=$3, starts_at=$4, ends_at=$5, duration_minutes=$6,
         shuffle_questions=$7, shuffle_options=$8, multi_scoring=$9,
         negative_marking=$10, show_answers=$11, recovery_window_seconds=$12,
         updated_at=now()
       WHERE id=$1`,
      [
        id,
        v.title,
        v.instructions,
        v.startsAt,
        v.endsAt,
        v.durationMinutes,
        v.shuffleQuestions,
        v.shuffleOptions,
        v.multiScoring,
        v.negativeMarking,
        v.showAnswers,
        v.recoveryWindowSeconds,
      ],
    );
  },

  async updateMeta(id: string, v: { title: string; instructions: string }) {
    await query(
      `UPDATE exams SET title=$2, instructions=$3, updated_at=now() WHERE id=$1`,
      [id, v.title, v.instructions],
    );
  },

  async replaceQuestions(
    c: PoolClient,
    examId: string,
    items: { questionId: string; marks: number }[],
  ) {
    await c.query("DELETE FROM exam_questions WHERE exam_id = $1", [examId]);
    for (const [i, item] of items.entries()) {
      await c.query(
        `INSERT INTO exam_questions (exam_id, question_id, position, marks)
         VALUES ($1, $2, $3, $4)`,
        [examId, item.questionId, i, item.marks],
      );
    }
  },

  async setStatus(id: string, status: ExamStatus) {
    await query(
      "UPDATE exams SET status = $2, updated_at = now() WHERE id = $1",
      [id, status],
    );
  },

  async countOwnedActiveQuestions(
    ownerId: string,
    questionIds: string[],
  ): Promise<number> {
    if (questionIds.length === 0) return 0;
    const [r] = await query<{ n: number }>(
      `SELECT count(*)::int AS n FROM questions
       WHERE owner_id = $1 AND NOT archived AND id = ANY($2::uuid[])`,
      [ownerId, questionIds],
    );
    return r.n;
  },

  async phaseCounts(ownerId?: string): Promise<Record<Phase, number>> {
    const params: unknown[] = [];
    const where = ownerId ? (params.push(ownerId), "WHERE e.owner_id = $1") : "";
    const rows = await query<{ phase: Phase; n: number }>(
      `SELECT (${PHASE_SQL}) AS phase, count(*)::int AS n
       FROM exams e ${where} GROUP BY 1`,
      params,
    );
    const out: Record<Phase, number> = {
      DRAFT: 0,
      UPCOMING: 0,
      ONGOING: 0,
      COMPLETED: 0,
    };
    for (const r of rows) out[r.phase] = r.n;
    return out;
  },
};
