import { z } from "zod";
import { emailSchema, nameSchema, ROLES } from "./auth";

/** Admin creates a user; the server generates a temporary password (shown once). */
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: z.enum(ROLES, { error: "Choose a role" }),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "Nothing to update",
  });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: (typeof ROLES)[number];
  isActive: boolean;
  createdAt: string;
};
export type AdminUserList = {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};
export type PlatformStats = {
  admins: number;
  examiners: number;
  candidates: number;
  inactive: number;
};
