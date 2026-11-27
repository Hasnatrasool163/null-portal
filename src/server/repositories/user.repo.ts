import "server-only";
import { query } from "../db";
import type { Role, SessionUser } from "@/shared/schemas/auth";

type Row = {
  id: string;
  name: string;
  email: string;
  role: Role;
  password_hash: string;
};
const toUser = ({ id, name, email, role }: Row): SessionUser => ({
  id,
  name,
  email,
  role,
});

export const userRepo = {
  async findById(id: string): Promise<SessionUser | null> {
    const rows = await query<Row>(
      "SELECT id, name, email, role, password_hash FROM users WHERE id = $1",
      [id],
    );
    return rows[0] ? toUser(rows[0]) : null;
  },
  async findWithHashByEmail(email: string) {
    const rows = await query<Row>(
      "SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = lower($1)",
      [email],
    );
    return rows[0]
      ? { user: toUser(rows[0]), passwordHash: rows[0].password_hash }
      : null;
  },
  async create(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<SessionUser> {
    const rows = await query<Row>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role, password_hash",
      [input.name, input.email, input.passwordHash],
    );
    return toUser(rows[0]);
  },
};
