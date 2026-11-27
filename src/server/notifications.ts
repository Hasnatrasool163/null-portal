import "server-only";
import type { PoolClient } from "pg";
import { query } from "./db";
import type {
  NotificationItem,
  NotificationList,
  NotificationType,
} from "@/shared/schemas/notification";

/**
 * In-app notifications.
 *
 * Event notifications are written in the same transaction as the change that causes them
 * (pass the tx client), so they commit or roll back together. Time-based reminders
 * ("closing soon", "grading pending") need no cron: they are generated lazily whenever the
 * user reads their notifications, and the (user_id, dedupe_key) unique key keeps them one-off.
 */

type Db = PoolClient | null;
const run = (c: Db, sql: string, params: unknown[]) =>
  c ? c.query(sql, params) : query(sql, params);

const fmtSql = (col: string) =>
  `to_char(${col} AT TIME ZONE 'UTC', 'Mon DD, HH24:MI "UTC"')`;

/**
 * "A new exam is available" for enrolled, active candidates of a PUBLISHED, not-cancelled exam.
 * On publish: everyone enrolled. On a late enrollment: only `candidateIds` (the people just
 * added), never the rest of the class. Shared dedupe key, so nobody is told twice.
 */
export async function notifyExamAvailable(
  c: Db,
  examId: string,
  type: "EXAM_PUBLISHED" | "EXAM_ENROLLED",
  candidateIds?: string[],
) {
  if (candidateIds && candidateIds.length === 0) return;
  await run(
    c,
    `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
     SELECT en.candidate_id, $2,
            CASE WHEN $2 = 'EXAM_PUBLISHED' THEN 'New exam published: ' ELSE 'You were enrolled in: ' END || e.title,
            'Available from ' || ${fmtSql("e.starts_at")} || ' until ' || ${fmtSql("e.ends_at")}
              || ' · ' || e.duration_minutes || ' min.',
            '/dashboard', e.id, 'exam-available:' || e.id
     FROM exams e
     JOIN enrollments en ON en.exam_id = e.id
     JOIN users u ON u.id = en.candidate_id AND u.is_active
     WHERE e.id = $1 AND e.status = 'PUBLISHED' AND NOT e.cancelled
       AND ($3::uuid[] IS NULL OR en.candidate_id = ANY($3::uuid[]))
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [examId, type, candidateIds ?? null],
  );
}

/** Results are out: every candidate with a submitted (non-sandbox) attempt, linking to their result. */
export async function notifyResultsPublished(c: Db, examId: string) {
  await run(
    c,
    `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
     SELECT a.candidate_id, 'RESULTS_PUBLISHED',
            'Results published: ' || e.title,
            'Your score and feedback are now available.',
            '/attempts/' || a.id || '/result', e.id, 'results:' || e.id
     FROM real_attempts a
     JOIN exams e ON e.id = a.exam_id
     WHERE a.exam_id = $1 AND a.status = 'SUBMITTED'
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [examId],
  );
}

/** Admin cancelled an exam: tell every enrolled candidate. */
export async function notifyExamCancelled(
  c: Db,
  examId: string,
  reason: string,
) {
  await run(
    c,
    `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
     SELECT en.candidate_id, 'EXAM_CANCELLED', 'Exam cancelled: ' || e.title,
            left('Reason: ' || $2, 1000), '/dashboard', e.id, 'cancelled:' || e.id
     FROM exams e JOIN enrollments en ON en.exam_id = e.id
     WHERE e.id = $1
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [examId, reason],
  );
}

/**
 * Candidate removed from an exam: drop their notifications about it, so nothing stale links
 * to an exam they can no longer see, and a later re-enrollment notifies them again.
 */
export async function clearExamNotifications(c: Db, examId: string, userId: string) {
  await run(c, "DELETE FROM notifications WHERE exam_id = $1 AND user_id = $2", [examId, userId]);
}

/** Direct notification to specific users (dispute updates etc.). dedupeKey must be unique per event. */
export async function notifyUsers(
  c: Db,
  userIds: string[],
  n: {
    type: NotificationType;
    title: string;
    body: string;
    link: string;
    examId: string | null;
    dedupeKey: string;
  },
) {
  if (userIds.length === 0) return;
  await run(
    c,
    `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
     SELECT u, $2, left($3, 200), left($4, 1000), $5, $6, $7
     FROM unnest($1::uuid[]) AS u
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [userIds, n.type, n.title, n.body, n.link, n.examId, n.dedupeKey],
  );
}

/**
 * Every active, enrolled candidate of an exam. `onlyNotSubmitted` skips candidates who already
 * submitted (e.g. a schedule change no longer matters to them).
 */
export async function notifyEnrolled(
  c: Db,
  examId: string,
  n: { type: NotificationType; title: string; body: string; link: string; dedupeKey: string },
  onlyNotSubmitted = false,
) {
  await run(
    c,
    `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
     SELECT en.candidate_id, $2, left($3, 200), left($4, 1000), $5, $1, $6
     FROM enrollments en
     JOIN users u ON u.id = en.candidate_id AND u.is_active
     WHERE en.exam_id = $1
       AND (NOT $7 OR NOT EXISTS (
         SELECT 1 FROM real_attempts a
         WHERE a.exam_id = $1 AND a.candidate_id = en.candidate_id AND a.status = 'SUBMITTED'))
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [examId, n.type, n.title, n.body, n.link, n.dedupeKey, onlyNotSubmitted],
  );
}

/**
 * A published result changed (regrade, answer-key correction, discarded late answer).
 * Tells the candidate old → new and why, and, if they hold a certificate that no longer
 * matches, that it now verifies as superseded and a fresh PDF is available.
 * Nothing is sent while results are unpublished (the candidate can't see scores yet).
 */
export async function notifyScoreChanged(
  c: PoolClient,
  attemptId: string,
  change: { from: number | null; to: number; reason: string },
  opts: { skipScoreNotice?: boolean } = {},
) {
  const a = (
    await c.query<{
      candidate_id: string;
      exam_id: string;
      title: string;
      published: boolean;
      cancelled: boolean;
      total_marks: number;
    }>(
      `SELECT a.candidate_id, a.exam_id, e.title, e.results_published_at IS NOT NULL AS published, e.cancelled,
              COALESCE((SELECT sum(marks) FROM attempt_questions WHERE attempt_id = a.id), 0)::numeric AS total_marks
       FROM attempts a JOIN exams e ON e.id = a.exam_id
       WHERE a.id = $1 AND NOT a.is_sandbox`,
      [attemptId],
    )
  ).rows[0];
  if (!a || !a.published || a.cancelled || change.from === change.to) return;
  const link = `/attempts/${attemptId}/result`;
  const out = `${change.from ?? 0} → ${change.to} / ${Number(a.total_marks)}`;
  if (!opts.skipScoreNotice) {
    await c.query(
      `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
       VALUES ($1, 'SCORE_CHANGED', left($2, 200), left($3, 1000), $4, $5, 'score:' || $6 || ':' || gen_random_uuid())`,
      [a.candidate_id, `Your score changed: ${a.title}`, `Your score changed from ${out} because ${change.reason}.`, link, a.exam_id, attemptId],
    );
  }
  const certs = await c.query(
    `SELECT 1 FROM report_verifications
     WHERE attempt_id = $1 AND NOT revoked AND abs(score_at_issue - $2) > 0.001 LIMIT 1`,
    [attemptId, change.to],
  );
  if (certs.rowCount) {
    await c.query(
      `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
       VALUES ($1, 'CERTIFICATE_SUPERSEDED', left($2, 200), $3, $4, $5, 'cert:' || $6 || ':' || $7)
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [
        a.candidate_id,
        `Download your updated certificate: ${a.title}`,
        "Your score changed, so the PDF you downloaded earlier now verifies as superseded. Download the updated report from your result page.",
        link,
        a.exam_id,
        attemptId,
        String(change.to),
      ],
    );
  }
}

/** Lazily creates time-based reminders for this user. Idempotent; cheap enough to run on each read. */
async function generateReminders(userId: string) {
  // Candidate: an ongoing exam closes within 24h / 1h and they haven't submitted yet.
  // Each band fires once; the 24h one is skipped if the exam is already inside the last hour.
  for (const [hours, minHours, key] of [
    [24, 1, "closing-24h"],
    [1, 0, "closing-1h"],
  ] as const) {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
       SELECT en.candidate_id, 'EXAM_CLOSING_SOON',
              'Closing soon: ' || e.title,
              'You have not submitted this exam yet. It closes ' || ${fmtSql("e.ends_at")}
                || ' (in about ' || CASE
                  WHEN e.ends_at - now() >= interval '2 hours'
                    THEN floor(extract(epoch FROM e.ends_at - now()) / 3600)::int || ' hours'
                  ELSE greatest(1, ceil(extract(epoch FROM e.ends_at - now()) / 60))::int || ' min'
                END || ').',
              '/dashboard', e.id, $3 || ':' || e.id
       FROM enrollments en
       JOIN exams e ON e.id = en.exam_id
       WHERE en.candidate_id = $1
         AND e.status = 'PUBLISHED' AND NOT e.cancelled
         AND now() BETWEEN e.starts_at AND e.ends_at
         AND e.ends_at - now() <= make_interval(hours => $2)
         AND e.ends_at - now() > make_interval(hours => $4)
         AND NOT EXISTS (
           SELECT 1 FROM real_attempts a
           WHERE a.exam_id = e.id AND a.candidate_id = en.candidate_id AND a.status = 'SUBMITTED'
         )
       ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
      [userId, hours, key, minHours],
    );
  }

  // Examiner: an exam they own has ended and still has ungraded written answers.
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link, exam_id, dedupe_key)
     SELECT e.owner_id, 'GRADING_PENDING', 'Grading needed: ' || e.title,
            p.n || ' submitted attempt(s) have written answers waiting for your marks.',
            '/exams/' || e.id, e.id, 'grading:' || e.id
     FROM exams e
     JOIN LATERAL (
       SELECT count(*)::int AS n FROM real_attempts a
       WHERE a.exam_id = e.id AND a.status = 'SUBMITTED' AND a.grading_status = 'NEEDS_REVIEW'
     ) p ON p.n > 0
     WHERE e.owner_id = $1 AND NOT e.cancelled AND e.results_published_at IS NULL
       AND (e.status = 'CLOSED' OR (e.status = 'PUBLISHED' AND now() > e.ends_at))
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [userId],
  );
}

type Row = {
  id: string;
  type: NotificationItem["type"];
  title: string;
  body: string;
  link: string | null;
  read_at: Date | null;
  created_at: Date;
};

export const notificationService = {
  async list(userId: string): Promise<NotificationList> {
    await generateReminders(userId);
    const rows = await query<Row>(
      `SELECT id, type, title, body, link, read_at, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [userId],
    );
    const [{ n }] = await query<{ n: number }>(
      "SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL",
      [userId],
    );
    return {
      unread: n,
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        link: r.link,
        read: r.read_at !== null,
        createdAt: r.created_at.toISOString(),
      })),
    };
  },

  /** Marks the given ids (or all, when omitted) as read. Only ever touches the caller's rows. */
  async markRead(userId: string, ids?: string[]) {
    await query(
      `UPDATE notifications SET read_at = now()
       WHERE user_id = $1 AND read_at IS NULL AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))`,
      [userId, ids ?? null],
    );
  },
};
