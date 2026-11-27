import { z } from "zod";
import { dateString } from "./common";

export const ITEM_STATUSES = ["todo", "in_progress", "done"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export const STATUS_LABEL: Record<ItemStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const itemInput = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title is too long"),
  description: z.string().trim().max(1000, "Max 1000 characters").optional(),
  status: z.enum(ITEM_STATUSES, "Choose a status"),
  priority: z.number("Choose a priority").int().min(1).max(5),
  dueDate: dateString.nullable().optional(),
});
export type ItemInput = z.infer<typeof itemInput>;

export const itemUpdate = itemInput.partial();
export type ItemUpdate = z.infer<typeof itemUpdate>;

export const SORT_FIELDS = [
  "created_at",
  "title",
  "priority",
  "due_date",
  "status",
] as const;
export const itemQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  sort: z.enum(SORT_FIELDS).default("created_at"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ItemQuery = z.infer<typeof itemQuery>;

export type Item = {
  id: string;
  ownerId: string;
  ownerName?: string;
  title: string;
  description: string;
  status: ItemStatus;
  priority: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
