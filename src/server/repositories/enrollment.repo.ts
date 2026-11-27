import "server-only";
import type { PoolClient } from "pg";
import { query } from "../db";
import type { CandidateOption, EnrolledCandidate } from "@/shared/schemas/exam";

export const enrollmentRepo = {
  async list(examId: string): Promise<EnrolledCandidate[]> {
    const rows = await query<{
      id: string;
      name: string;
      email: string;
      enrolled_at: Date;
    }>(
      `SELECT u.id, u.name, u.email, en.enrolled_at
       FROM enrollments en
       JOIN users u ON u.id = en.candidate_id
       WHERE en.exam_id = $1
       ORDER BY lower(u.name), lower(u.email)`,
      [examId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      enrolledAt: r.enrolled_at.toISOString(),
    }));
  },

  async searchCandidates(
    q: string | undefined,
    examId: string | undefined,
  ): Promise<CandidateOption[]> {
    const params: unknown[] = [examId ?? null];
    let filter = "WHERE u.role = 'CANDIDATE' AND u.is_active";
    if (q) {
      params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
      filter += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    const rows = await query<{
      id: string;
      name: string;
      email: string;
      enrolled: boolean;
    }>(
      `SELECT u.id, u.name, u.email,
              EXISTS (
                SELECT 1 FROM enrollments en
                WHERE en.exam_id = $1::uuid AND en.candidate_id = u.id
              ) AS enrolled
       FROM users u ${filter}
       ORDER BY lower(u.name)
       LIMIT 50`,
      params,
    );
    return rows;
  },

  async findActiveCandidatesByIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await query<{ id: string }>(
      `SELECT id FROM users
       WHERE role = 'CANDIDATE' AND is_active AND id = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map((r) => r.id);
  },

  /** Returns the ids that were newly enrolled (already-enrolled ones are skipped). */
  async enrollMany(examId: string, candidateIds: string[]): Promise<string[]> {
    if (candidateIds.length === 0) return [];
    const rows = await query<{ candidate_id: string }>(
      `INSERT INTO enrollments (exam_id, candidate_id)
       SELECT $1, unnest($2::uuid[])
       ON CONFLICT DO NOTHING
       RETURNING candidate_id`,
      [examId, candidateIds],
    );
    return rows.map((r) => r.candidate_id);
  },

  async enrollInTx(c: PoolClient, examId: string, candidateId: string): Promise<boolean> {
    const r = await c.query(
      `INSERT INTO enrollments (exam_id, candidate_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING candidate_id`,
      [examId, candidateId],
    );
    return (r.rowCount ?? 0) > 0;
  },

  async remove(examId: string, candidateId: string) {
    await query(
      "DELETE FROM enrollments WHERE exam_id = $1 AND candidate_id = $2",
      [examId, candidateId],
    );
  },

  async findUsersByEmails(emails: string[]) {
    if (emails.length === 0) return new Map<string, { id: string; role: string; isActive: boolean }>();
    const lower = emails.map((e) => e.toLowerCase());
    const rows = await query<{
      id: string;
      email: string;
      role: string;
      is_active: boolean;
    }>(
      "SELECT id, email, role, is_active FROM users WHERE lower(email) = ANY($1::text[])",
      [lower],
    );
    const map = new Map<string, { id: string; role: string; isActive: boolean }>();
    for (const r of rows) {
      map.set(r.email.toLowerCase(), {
        id: r.id,
        role: r.role,
        isActive: r.is_active,
      });
    }
    return map;
  },
};
