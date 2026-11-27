import "server-only";
import type { PoolClient } from "pg";
import { query } from "../db";
import type {
  QuestionDetail,
  QuestionListItem,
  QuestionListQuery,
  QuestionType,
  Difficulty,
  OptionInput,
} from "@/shared/schemas/question";

type Row = {
  id: string;
  topic_id: string;
  topic_name: string;
  type: QuestionType;
  difficulty: Difficulty;
  body: string;
  default_marks: number;
  updated_at: Date;
};
const SELECT = `SELECT q.id, q.topic_id, t.name AS topic_name, q.type, q.difficulty, q.body,
                       q.default_marks, q.updated_at
                FROM questions q JOIN topics t ON t.id = q.topic_id`;
const toItem = (r: Row): QuestionListItem => ({
  id: r.id,
  topicId: r.topic_id,
  topicName: r.topic_name,
  type: r.type,
  difficulty: r.difficulty,
  body: r.body,
  defaultMarks: r.default_marks,
  updatedAt: r.updated_at.toISOString(),
});

type Fields = {
  topicId: string;
  type: QuestionType;
  difficulty: Difficulty;
  body: string;
  defaultMarks: number;
  options: OptionInput[];
};

async function writeOptions(
  c: PoolClient,
  questionId: string,
  options: OptionInput[],
) {
  await c.query("DELETE FROM question_options WHERE question_id = $1", [
    questionId,
  ]);
  for (const [i, o] of options.entries()) {
    await c.query(
      "INSERT INTO question_options (question_id, body, is_correct, position) VALUES ($1,$2,$3,$4)",
      [questionId, o.body, o.isCorrect, i],
    );
  }
}

export const questionRepo = {
  async list(ownerId: string, q: QuestionListQuery) {
    const where = ["q.owner_id = $1", "NOT q.archived"];
    const params: unknown[] = [ownerId];
    const add = (sql: string, v: unknown) => {
      params.push(v);
      where.push(sql.replace("?", `$${params.length}`));
    };
    if (q.q) add("q.body ILIKE ?", `%${q.q.replace(/[%_\\]/g, "\\$&")}%`);
    if (q.topicId) add("q.topic_id = ?", q.topicId);
    if (q.difficulty) add("q.difficulty = ?", q.difficulty);
    if (q.type) add("q.type = ?", q.type);
    const w = `WHERE ${where.join(" AND ")}`;
    const [{ n }] = await query<{ n: number }>(
      `SELECT count(*)::int AS n FROM questions q ${w}`,
      params,
    );
    const rows = await query<Row>(
      `${SELECT} ${w} ORDER BY q.created_at DESC, q.id
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, q.pageSize, (q.page - 1) * q.pageSize],
    );
    return { items: rows.map(toItem), total: n };
  },

  async findOwned(ownerId: string, id: string): Promise<QuestionDetail | null> {
    const rows = await query<Row>(
      `${SELECT} WHERE q.id = $1 AND q.owner_id = $2 AND NOT q.archived`,
      [id, ownerId],
    );
    if (!rows[0]) return null;
    const opts = await query<{
      id: number;
      body: string;
      is_correct: boolean;
      position: number;
    }>(
      "SELECT id, body, is_correct, position FROM question_options WHERE question_id = $1 ORDER BY position",
      [id],
    );
    return {
      ...toItem(rows[0]),
      options: opts.map((o) => ({
        id: o.id,
        body: o.body,
        isCorrect: o.is_correct,
        position: o.position,
      })),
    };
  },

  async insert(c: PoolClient, ownerId: string, f: Fields): Promise<string> {
    const r = await c.query<{ id: string }>(
      `INSERT INTO questions (owner_id, topic_id, type, difficulty, body, default_marks)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [ownerId, f.topicId, f.type, f.difficulty, f.body, f.defaultMarks],
    );
    await writeOptions(c, r.rows[0].id, f.options);
    return r.rows[0].id;
  },

  async update(c: PoolClient, id: string, f: Fields) {
    await c.query(
      `UPDATE questions SET topic_id=$2, type=$3, difficulty=$4, body=$5,
              default_marks=$6, updated_at=now() WHERE id=$1`,
      [id, f.topicId, f.type, f.difficulty, f.body, f.defaultMarks],
    );
    await writeOptions(c, id, f.options);
  },

  async archive(id: string) {
    await query(
      "UPDATE questions SET archived = true, updated_at = now() WHERE id = $1",
      [id],
    );
  },
};
