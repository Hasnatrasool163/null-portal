import "server-only";
import { query, tx } from "../db";
import { Errors, assertUuid } from "../http";
import { examRepo } from "../repositories/exam.repo";
import { attemptRepo } from "../repositories/attempt.repo";
import { finalizeIfExpiredInTx } from "./attempt.service";
import { finalizeExpiredForExam } from "./grading.service";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  AnnouncementItem,
  CreateIncidentInput,
  GrantExtensionInput,
  HeartbeatResponse,
  IncidentItem,
  IncidentType,
  MonitorResponse,
  TimeExtensionItem,
} from "@/shared/schemas/monitoring";
import type { AttemptStatus } from "@/shared/schemas/attempt";

async function fetchAnnouncements(examId: string): Promise<AnnouncementItem[]> {
  const rows = await query<{
    id: string;
    message: string;
    author_name: string;
    created_at: Date;
  }>(
    `SELECT a.id, a.message, u.name AS author_name, a.created_at
     FROM announcements a
     JOIN users u ON u.id = a.author_id
     WHERE a.exam_id = $1
     ORDER BY a.created_at DESC`,
    [examId],
  );
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    authorName: r.author_name,
    createdAt: r.created_at.toISOString(),
  }));
}

export const monitoringService = {
  /** Candidate heartbeat (~10s): updates last_seen_at, syncs server time & deadline, returns announcements. */
  async heartbeat(
    user: SessionUser,
    attemptIdRaw: string,
  ): Promise<HeartbeatResponse> {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");

    const updated = await tx(async (c) => {
      const locked = (await attemptRepo.findByIdForUpdate(c, attemptId))!;
      await c.query("UPDATE attempts SET last_seen_at = now() WHERE id = $1", [
        attemptId,
      ]);
      return finalizeIfExpiredInTx(c, locked);
    });

    const announcements = await fetchAnnouncements(updated.exam_id);
    return {
      serverNow: updated.server_now.toISOString(),
      deadlineAt: updated.deadline_at.toISOString(),
      status: updated.status,
      announcements,
    };
  },

  /** Advisory incident log (server timestamp, never auto-penalizes). */
  async recordIncident(
    user: SessionUser,
    attemptIdRaw: string,
    input: CreateIncidentInput,
  ) {
    const attemptId = assertUuid(attemptIdRaw, "Attempt");
    const owned = await attemptRepo.findForCandidate(attemptId, user.id);
    if (!owned) throw Errors.notFound("Attempt not found");
    if (owned.is_sandbox || owned.status !== "IN_PROGRESS") {
      return { recorded: false };
    }
    const rows = await query<{ id: string; occurred_at: Date }>(
      `INSERT INTO incidents (attempt_id, type, details)
       VALUES ($1, $2, $3::jsonb) RETURNING id, occurred_at`,
      [attemptId, input.type, JSON.stringify(input.details ?? {})],
    );
    return {
      recorded: true,
      id: rows[0].id,
      occurredAt: rows[0].occurred_at.toISOString(),
    };
  },

  async listAnnouncements(user: SessionUser, examIdRaw: string) {
    const examId = assertUuid(examIdRaw, "Exam");
    const ownerId = user.role === "ADMIN" ? undefined : user.id;
    const exam = await examRepo.findById(examId, ownerId);
    if (!exam) throw Errors.notFound("Exam not found");
    return fetchAnnouncements(exam.id);
  },

  async postAnnouncement(
    user: SessionUser,
    examIdRaw: string,
    message: string,
  ): Promise<AnnouncementItem> {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const examId = assertUuid(examIdRaw, "Exam");
    const exam = await examRepo.findById(examId, user.id);
    if (!exam) throw Errors.notFound("Exam not found");

    const rows = await query<{ id: string; created_at: Date }>(
      `INSERT INTO announcements (exam_id, author_id, message)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [exam.id, user.id, message],
    );
    return {
      id: rows[0].id,
      message,
      authorName: user.name,
      createdAt: rows[0].created_at.toISOString(),
    };
  },

  /** Audited individual time extension (the ONLY way a deadline moves). */
  async grantExtension(
    user: SessionUser,
    attemptIdRaw: string,
    input: GrantExtensionInput,
  ) {
    if (user.role !== "EXAMINER") throw Errors.forbidden();
    const attemptId = assertUuid(attemptIdRaw, "Attempt");

    return tx(async (c) => {
      const attempt = await attemptRepo.findByIdForUpdate(c, attemptId);
      if (!attempt || attempt.is_sandbox) {
        throw Errors.notFound("Attempt not found");
      }
      const ex = await c.query<{ owner_id: string }>(
        "SELECT owner_id FROM exams WHERE id = $1",
        [attempt.exam_id],
      );
      if (!ex.rows[0] || ex.rows[0].owner_id !== user.id) {
        throw Errors.notFound("Attempt not found");
      }
      if (attempt.status !== "IN_PROGRESS") {
        throw Errors.conflict(
          "Cannot grant a time extension to an already submitted attempt.",
        );
      }

      const upd = await c.query<{ deadline_at: Date }>(
        `UPDATE attempts
         SET deadline_at = GREATEST(deadline_at, now()) + ($2 || ' minutes')::interval
         WHERE id = $1
         RETURNING deadline_at`,
        [attemptId, input.minutes],
      );
      const ext = await c.query<{ id: string; created_at: Date }>(
        `INSERT INTO time_extensions (attempt_id, minutes, reason, granted_by)
         VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
        [attemptId, input.minutes, input.reason, user.id],
      );
      return {
        id: ext.rows[0].id,
        attemptId,
        minutes: input.minutes,
        reason: input.reason,
        newDeadlineAt: upd.rows[0].deadline_at.toISOString(),
        createdAt: ext.rows[0].created_at.toISOString(),
      };
    });
  },

  /** Live monitor data (polled every 5s; lazily finalizes expired attempts first). */
  async getMonitor(
    user: SessionUser,
    examIdRaw: string,
  ): Promise<MonitorResponse> {
    const examId = assertUuid(examIdRaw, "Exam");
    const ownerId = user.role === "ADMIN" ? undefined : user.id;
    const exam = await examRepo.findById(examId, ownerId);
    if (!exam) throw Errors.notFound("Exam not found");

    await finalizeExpiredForExam(exam.id);

    const [{ server_now }] = await query<{ server_now: Date }>(
      "SELECT now() AS server_now",
    );

    const rows = await query<{
      id: string;
      candidate_name: string;
      candidate_email: string;
      status: AttemptStatus;
      started_at: Date;
      deadline_at: Date;
      last_seen_at: Date;
      remaining_seconds: number;
      last_seen_age_seconds: number;
      total_questions: number;
      answered_count: number;
      late_sync_count: number;
    }>(
      `SELECT a.id, u.name AS candidate_name, u.email AS candidate_email,
              a.status, a.started_at, a.deadline_at, a.last_seen_at,
              GREATEST(0, EXTRACT(EPOCH FROM (a.deadline_at - now())))::int AS remaining_seconds,
              GREATEST(0, EXTRACT(EPOCH FROM (now() - a.last_seen_at)))::int AS last_seen_age_seconds,
              (SELECT count(*)::int FROM attempt_questions aq WHERE aq.attempt_id = a.id) AS total_questions,
              (SELECT count(*)::int FROM answers ans
               WHERE ans.attempt_id = a.id
                 AND (cardinality(ans.selected_option_ids) > 0 OR COALESCE(trim(ans.text_answer), '') <> '')
              ) AS answered_count,
              (SELECT count(*)::int FROM answers ans
               WHERE ans.attempt_id = a.id AND ans.synced_late
              ) AS late_sync_count
       FROM real_attempts a
       JOIN users u ON u.id = a.candidate_id
       WHERE a.exam_id = $1
       ORDER BY (a.status = 'IN_PROGRESS') DESC, a.last_seen_at DESC`,
      [exam.id],
    );

    const ids = rows.map((r) => r.id);
    const [incRows, extRows, announcements] = await Promise.all([
      ids.length === 0
        ? []
        : query<{
            id: string;
            attempt_id: string;
            type: IncidentType;
            occurred_at: Date;
            details: Record<string, unknown>;
          }>(
            `SELECT id, attempt_id, type, occurred_at, details
             FROM incidents WHERE attempt_id = ANY($1::uuid[])
             ORDER BY occurred_at DESC`,
            [ids],
          ),
      ids.length === 0
        ? []
        : query<{
            id: string;
            attempt_id: string;
            minutes: number;
            reason: string;
            granted_by_name: string;
            created_at: Date;
          }>(
            `SELECT te.id, te.attempt_id, te.minutes, te.reason, u.name AS granted_by_name, te.created_at
             FROM time_extensions te
             JOIN users u ON u.id = te.granted_by
             WHERE te.attempt_id = ANY($1::uuid[])
             ORDER BY te.created_at DESC`,
            [ids],
          ),
      fetchAnnouncements(exam.id),
    ]);

    const incByAtt = new Map<string, IncidentItem[]>();
    for (const i of incRows) {
      const list = incByAtt.get(i.attempt_id) ?? [];
      list.push({
        id: i.id,
        type: i.type,
        occurredAt: i.occurred_at.toISOString(),
        details: i.details ?? {},
      });
      incByAtt.set(i.attempt_id, list);
    }

    const extByAtt = new Map<string, TimeExtensionItem[]>();
    for (const e of extRows) {
      const list = extByAtt.get(e.attempt_id) ?? [];
      list.push({
        id: e.id,
        minutes: e.minutes,
        reason: e.reason,
        grantedByName: e.granted_by_name,
        createdAt: e.created_at.toISOString(),
      });
      extByAtt.set(e.attempt_id, list);
    }

    return {
      examId: exam.id,
      examTitle: exam.title,
      serverNow: server_now.toISOString(),
      announcements,
      attempts: rows.map((r) => {
        const incidents = incByAtt.get(r.id) ?? [];
        const disconnectCount = incidents.filter(
          (i) => i.type === "DISCONNECT",
        ).length;
        const totalOfflineSeconds = incidents
          .filter((i) => i.type === "RECONNECT")
          .reduce(
            (sum, i) =>
              sum +
              (typeof i.details.offlineSeconds === "number"
                ? i.details.offlineSeconds
                : 0),
            0,
          );
        return {
          attemptId: r.id,
          candidateName: r.candidate_name,
          candidateEmail: r.candidate_email,
          status: r.status,
          answeredCount: r.answered_count,
          totalQuestions: r.total_questions,
          startedAt: r.started_at.toISOString(),
          deadlineAt: r.deadline_at.toISOString(),
          remainingSeconds: r.status === "IN_PROGRESS" ? r.remaining_seconds : 0,
          lastSeenAt: r.last_seen_at.toISOString(),
          lastSeenAgeSeconds: r.last_seen_age_seconds,
          incidentCount: incidents.length,
          disconnectCount,
          totalOfflineSeconds: Math.round(totalOfflineSeconds),
          lateSyncCount: r.late_sync_count,
          incidents,
          extensions: extByAtt.get(r.id) ?? [],
        };
      }),
    };
  },
};
