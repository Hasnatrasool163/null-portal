import "server-only";
import type { PoolClient } from "pg";
import { query } from "./db";
import type { SessionUser } from "@/shared/schemas/auth";
import type {
  AuditAction,
  AuditEntry,
  AuditList,
  AuditListQuery,
} from "@/shared/schemas/audit";

type AuditInput = {
  action: AuditAction;
  examId?: string | null;
  targetType: string;
  targetId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
};

/**
 * Append one audit row. Pass the transaction client whenever the audited change runs in a
 * transaction, so the change and its audit record commit (or roll back) together.
 */
export async function audit(
  c: PoolClient | null,
  actor: SessionUser,
  e: AuditInput,
) {
  const sql = `INSERT INTO audit_log
      (actor_id, actor_name, actor_role, action, exam_id, target_type, target_id, summary, details)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`;
  const params = [
    actor.id,
    actor.name,
    actor.role,
    e.action,
    e.examId ?? null,
    e.targetType,
    e.targetId ?? null,
    e.summary.slice(0, 500),
    JSON.stringify(e.details ?? {}),
  ];
  if (c) await c.query(sql, params);
  else await query(sql, params);
}

type Row = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
  exam_id: string | null;
  exam_title: string | null;
  target_type: string;
  target_id: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: Date;
  total: number;
};

/** Newest first. `examId` scopes the list to one exam (examiner/admin exam view). */
export async function listAudit(
  q: AuditListQuery,
  examId?: string,
): Promise<AuditList> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (examId) {
    params.push(examId);
    where.push(`l.exam_id = $${params.length}`);
  }
  if (q.action) {
    params.push(q.action);
    where.push(`l.action = $${params.length}`);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(q.pageSize, (q.page - 1) * q.pageSize);
  const rows = await query<Row>(
    `SELECT l.id::text, l.actor_id, l.actor_name, l.actor_role, l.action, l.exam_id,
            e.title AS exam_title, l.target_type, l.target_id, l.summary, l.details,
            l.created_at, count(*) OVER ()::int AS total
     FROM audit_log l
     LEFT JOIN exams e ON e.id = l.exam_id
     ${w}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const items: AuditEntry[] = rows.map((r) => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    action: r.action,
    examId: r.exam_id,
    examTitle: r.exam_title,
    targetType: r.target_type,
    targetId: r.target_id,
    summary: r.summary,
    details: r.details,
    createdAt: r.created_at.toISOString(),
  }));
  return {
    items,
    total: rows[0]?.total ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}
