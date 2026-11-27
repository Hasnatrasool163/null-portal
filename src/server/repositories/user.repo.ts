import "server-only";
import { query } from "../db";
import type { Role, SessionUser } from "@/shared/schemas/auth";
import type {
  AdminUser,
  PlatformStats,
  UserListQuery,
} from "@/shared/schemas/user";

type Row = {
  id: string;
  name: string;
  email: string;
  role: Role;
  password_hash: string;
  is_active: boolean;
  session_version: number;
  created_at: Date;
};
const COLS =
  "id, name, email, role, password_hash, is_active, session_version, created_at";
const toUser = ({ id, name, email, role }: Row): SessionUser => ({
  id,
  name,
  email,
  role,
});
const toAdminUser = (r: Row): AdminUser => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  isActive: r.is_active,
  createdAt: r.created_at.toISOString(),
});

export const userRepo = {
  /** Active users with matching session_version only: logout & deactivation revoke immediately. */
  async findById(
    id: string,
    sessionVersion: number,
  ): Promise<SessionUser | null> {
    const rows = await query<Row>(
      `SELECT ${COLS} FROM users WHERE id = $1 AND is_active AND session_version = $2`,
      [id, sessionVersion],
    );
    return rows[0] ? toUser(rows[0]) : null;
  },
  async bumpSessionVersion(id: string): Promise<void> {
    await query(
      "UPDATE users SET session_version = session_version + 1 WHERE id = $1",
      [id],
    );
  },
  async findAnyById(id: string): Promise<AdminUser | null> {
    const rows = await query<Row>(`SELECT ${COLS} FROM users WHERE id = $1`, [
      id,
    ]);
    return rows[0] ? toAdminUser(rows[0]) : null;
  },
  async findWithHashByEmail(email: string) {
    const rows = await query<Row>(
      `SELECT ${COLS} FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    return rows[0]
      ? {
          user: toUser(rows[0]),
          passwordHash: rows[0].password_hash,
          isActive: rows[0].is_active,
          sessionVersion: rows[0].session_version,
        }
      : null;
  },
  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
    role?: Role;
  }): Promise<SessionUser> {
    const rows = await query<Row>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, COALESCE($4, 'CANDIDATE')) RETURNING ${COLS}`,
      [input.name, input.email, input.passwordHash, input.role ?? null],
    );
    return toUser(rows[0]);
  },

  async list(q: UserListQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (q.q) {
      params.push(`%${q.q.replace(/[%_\\]/g, "\\$&")}%`);
      where.push(
        `(name ILIKE $${params.length} OR email ILIKE $${params.length})`,
      );
    }
    if (q.role) {
      params.push(q.role);
      where.push(`role = $${params.length}`);
    }
    const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [{ n }] = await query<{ n: number }>(
      `SELECT count(*)::int AS n FROM users ${w}`,
      params,
    );
    const rows = await query<Row>(
      `SELECT ${COLS} FROM users ${w} ORDER BY created_at DESC, id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, q.pageSize, (q.page - 1) * q.pageSize],
    );
    return { users: rows.map(toAdminUser), total: n };
  },

  async update(id: string, patch: { role?: Role; isActive?: boolean }) {
    const rows = await query<Row>(
      `UPDATE users SET role = COALESCE($2, role), is_active = COALESCE($3, is_active)
       WHERE id = $1 RETURNING ${COLS}`,
      [id, patch.role ?? null, patch.isActive ?? null],
    );
    return rows[0] ? toAdminUser(rows[0]) : null;
  },

  /** Active admins other than `excludeId` (guards against locking everyone out). */
  async countOtherActiveAdmins(excludeId: string) {
    const [{ n }] = await query<{ n: number }>(
      "SELECT count(*)::int AS n FROM users WHERE role = 'ADMIN' AND is_active AND id <> $1",
      [excludeId],
    );
    return n;
  },

  async stats(): Promise<PlatformStats> {
    const [r] = await query<PlatformStats>(
      `SELECT count(*) FILTER (WHERE role = 'ADMIN')::int      AS admins,
              count(*) FILTER (WHERE role = 'EXAMINER')::int   AS examiners,
              count(*) FILTER (WHERE role = 'CANDIDATE')::int  AS candidates,
              count(*) FILTER (WHERE NOT is_active)::int       AS inactive
       FROM users`,
    );
    return r;
  },
};
