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
  locked: boolean;
  updated_at: Date;
};
const SELECT = `SELECT q.id, q.topic_id, t.name AS topic_name, q.type, q.difficulty, q.body,
                       q.default_marks, q.updated_at,
                       EXISTS (
                         SELECT 1 FROM exam_questions eq
                         JOIN exams e ON e.id = eq.exam_id
                         WHERE eq.question_id = q.id AND e.status <> 'DRAFT'
                       ) AS locked
                FROM questions q JOIN topics t ON t.id = q.topic_id`;
const toItem = (r: Row): QuestionListItem => ({
  id: r.id,
  topicId: r.topic_id,
  topicName: r.topic_name,
  type: r.type,
  difficulty: r.difficulty,
  body: r.body,
  defaultMarks: r.default_marks,
  locked: r.locked,
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
  if (options.length === 0) return;
  await c.query(
    `INSERT INTO question_options (question_id, body, is_correct, position)
     SELECT $1, body, is_correct, position
     FROM unnest($2::text[], $3::boolean[], $4::int[]) AS t(body, is_correct, position)`,
    [
      questionId,
      options.map((o) => o.body),
      options.map((o) => o.isCorrect),
      options.map((_, i) => i),
    ],
  );
}

export const questionRepo = {
  async list(ownerId: string, q: QuestionListQuery) {
    const where = ["q.owner_id = $1", q.status === "archived" ? "q.archived" : "NOT q.archived"];
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

  /** Bulk insert questions + options in 2 SQL statements (preserving input order). */
  async insertMany(
    c: PoolClient,
    ownerId: string,
    rows: Fields[],
  ): Promise<string[]> {
    if (rows.length === 0) return [];
    const inserted = (
      await c.query<{ id: string }>(
        `INSERT INTO questions (owner_id, topic_id, type, difficulty, body, default_marks)
         SELECT $1, topic_id, type, difficulty, body, default_marks
         FROM unnest(
           $2::uuid[], $3::text[], $4::text[], $5::text[], $6::numeric[]
         ) WITH ORDINALITY AS t(topic_id, type, difficulty, body, default_marks, ord)
         ORDER BY ord
         RETURNING id`,
        [
          ownerId,
          rows.map((r) => r.topicId),
          rows.map((r) => r.type),
          rows.map((r) => r.difficulty),
          rows.map((r) => r.body),
          rows.map((r) => r.defaultMarks),
        ],
      )
    ).rows;
    const ids = inserted.map((r) => r.id);

    const qIds: string[] = [];
    const bodies: string[] = [];
    const corrects: boolean[] = [];
    const positions: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      const qId = ids[i];
      for (let pos = 0; pos < rows[i].options.length; pos++) {
        const opt = rows[i].options[pos];
        qIds.push(qId);
        bodies.push(opt.body);
        corrects.push(opt.isCorrect);
        positions.push(pos);
      }
    }
    if (qIds.length > 0) {
      await c.query(
        `INSERT INTO question_options (question_id, body, is_correct, position)
         SELECT question_id, body, is_correct, position
         FROM unnest($1::uuid[], $2::text[], $3::boolean[], $4::int[])
           AS t(question_id, body, is_correct, position)`,
        [qIds, bodies, corrects, positions],
      );
    }
    return ids;
  },

  async update(c: PoolClient, id: string, f: Fields) {
    await c.query(
      `UPDATE questions SET topic_id=$2, type=$3, difficulty=$4, body=$5,
              default_marks=$6, updated_at=now() WHERE id=$1`,
      [id, f.topicId, f.type, f.difficulty, f.body, f.defaultMarks],
    );
    await writeOptions(c, id, f.options);
  },

  /** Owner check is in the WHERE clause; returns false if not found or not archived. */
  async restore(ownerId: string, id: string) {
    const rows = await query<{ id: string }>(
      "UPDATE questions SET archived = false, updated_at = now() WHERE id = $1 AND owner_id = $2 AND archived RETURNING id",
      [id, ownerId],
    );
    return rows.length > 0;
  },

  async archive(id: string) {
    await query(
      "UPDATE questions SET archived = true, updated_at = now() WHERE id = $1",
      [id],
    );
  },
};
