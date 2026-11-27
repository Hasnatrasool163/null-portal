import "server-only";
import type { PoolClient } from "pg";
import { query } from "../db";
import type { Topic } from "@/shared/schemas/question";

type Row = { id: string; name: string; question_count: number };
const toTopic = (r: Row): Topic => ({
  id: r.id,
  name: r.name,
  questionCount: r.question_count,
});

export const topicRepo = {
  async list(ownerId: string): Promise<Topic[]> {
    const rows = await query<Row>(
      `SELECT t.id, t.name,
              count(q.id) FILTER (WHERE NOT q.archived)::int AS question_count
       FROM topics t LEFT JOIN questions q ON q.topic_id = t.id
       WHERE t.owner_id = $1
       GROUP BY t.id ORDER BY lower(t.name)`,
      [ownerId],
    );
    return rows.map(toTopic);
  },
  async findOwned(ownerId: string, id: string) {
    const rows = await query<{ id: string; name: string }>(
      "SELECT id, name FROM topics WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );
    return rows[0] ?? null;
  },
  async findByName(ownerId: string, name: string) {
    const rows = await query<{ id: string }>(
      "SELECT id FROM topics WHERE owner_id = $1 AND lower(name) = lower($2)",
      [ownerId, name],
    );
    return rows[0] ?? null;
  },
  async create(ownerId: string, name: string): Promise<Topic> {
    const rows = await query<{ id: string; name: string }>(
      "INSERT INTO topics (owner_id, name) VALUES ($1, $2) RETURNING id, name",
      [ownerId, name],
    );
    return { ...rows[0], questionCount: 0 };
  },
  async rename(id: string, name: string) {
    await query("UPDATE topics SET name = $2 WHERE id = $1", [id, name]);
  },
  async countQuestions(id: string) {
    const [r] = await query<{ n: number }>(
      "SELECT count(*)::int AS n FROM questions WHERE topic_id = $1",
      [id],
    );
    return r.n;
  },
  async remove(id: string) {
    await query("DELETE FROM topics WHERE id = $1", [id]);
  },
  /** Find-or-create by case-insensitive name, race-free (used by bulk import). */
  async ensureByName(c: PoolClient, ownerId: string, name: string) {
    const r = await c.query<{ id: string }>(
      `INSERT INTO topics (owner_id, name) VALUES ($1, $2)
       ON CONFLICT (owner_id, (lower(name))) DO UPDATE SET name = topics.name
       RETURNING id`,
      [ownerId, name],
    );
    return r.rows[0].id;
  },
};
