import "server-only";
import { query } from "../db";
import type {
  Item,
  ItemInput,
  ItemQuery,
  ItemStatus,
} from "@/shared/schemas/item";

type Row = {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  status: ItemStatus;
  priority: number;
  due_date: string | null;
  created_at: Date;
  updated_at: Date;
};
const toItem = (r: Row): Item => ({
  id: r.id,
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  title: r.title,
  description: r.description,
  status: r.status,
  priority: r.priority,
  dueDate: r.due_date,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const SELECT = `SELECT i.*, u.name AS owner_name FROM items i JOIN users u ON u.id = i.owner_id`;
// Whitelist: sort column names are never taken from user input directly.
const SORT: Record<ItemQuery["sort"], string> = {
  created_at: "i.created_at",
  title: "lower(i.title)",
  priority: "i.priority",
  due_date: "i.due_date",
  status: "i.status",
};

export const itemRepo = {
  async list(q: ItemQuery, ownerId?: string) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (ownerId) {
      params.push(ownerId);
      where.push(`i.owner_id = $${params.length}`);
    }
    if (q.status) {
      params.push(q.status);
      where.push(`i.status = $${params.length}`);
    }
    if (q.q) {
      params.push(`%${q.q}%`);
      where.push(
        `(i.title ILIKE $${params.length} OR i.description ILIKE $${params.length})`,
      );
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const order = `${SORT[q.sort]} ${q.order === "asc" ? "ASC" : "DESC"} NULLS LAST, i.created_at DESC`;
    params.push(q.pageSize, (q.page - 1) * q.pageSize);
    const rows = await query<Row & { total: number }>(
      `SELECT i.*, u.name AS owner_name, count(*) OVER() AS total
         FROM items i JOIN users u ON u.id = i.owner_id ${clause}
        ORDER BY ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: rows.map(toItem), total: rows[0]?.total ?? 0 };
  },
  async findById(id: string) {
    const rows = await query<Row>(`${SELECT} WHERE i.id = $1`, [id]);
    return rows[0] ? toItem(rows[0]) : null;
  },
  async findByTitle(ownerId: string, title: string) {
    const rows = await query<Row>(
      `${SELECT} WHERE i.owner_id = $1 AND lower(i.title) = lower($2)`,
      [ownerId, title],
    );
    return rows[0] ? toItem(rows[0]) : null;
  },
  async create(ownerId: string, d: ItemInput) {
    const rows = await query<{ id: string }>(
      `INSERT INTO items (owner_id, title, description, status, priority, due_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        ownerId,
        d.title,
        d.description ?? "",
        d.status,
        d.priority,
        d.dueDate ?? null,
      ],
    );
    return (await this.findById(rows[0].id))!;
  },
  async update(id: string, d: Partial<ItemInput>) {
    const sets: string[] = [];
    const params: unknown[] = [];
    const add = (col: string, v: unknown) => {
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    };
    if (d.title !== undefined) add("title", d.title);
    if (d.description !== undefined) add("description", d.description);
    if (d.status !== undefined) add("status", d.status);
    if (d.priority !== undefined) add("priority", d.priority);
    if (d.dueDate !== undefined) add("due_date", d.dueDate);
    if (sets.length) {
      params.push(id);
      await query(
        `UPDATE items SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length}`,
        params,
      );
    }
    return this.findById(id);
  },
  async remove(id: string) {
    await query("DELETE FROM items WHERE id = $1", [id]);
  },
  async countByStatus(ownerId?: string) {
    const rows = await query<{ status: ItemStatus; n: number }>(
      `SELECT status, count(*)::int AS n FROM items ${ownerId ? "WHERE owner_id = $1" : ""} GROUP BY status`,
      ownerId ? [ownerId] : [],
    );
    return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<
      Record<ItemStatus, number>
    >;
  },
};
