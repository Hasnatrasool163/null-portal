import { api, qs } from "./client";
import type { Role } from "@/shared/schemas/auth";
import type {
  AdminUser,
  AdminUserList,
  CreateUserInput,
  UpdateUserInput,
} from "@/shared/schemas/user";

/** A newly created or reset account, with the one-time temporary password. */
export type IssuedCredentials = { user: AdminUser; tempPassword: string };

/** Admin user management. */
export const usersApi = {
  list: (filters: {
    q?: string;
    role?: Role | "";
    page: number;
    pageSize: number;
  }) => api<AdminUserList>(`/api/admin/users${qs(filters)}`),
  examiners: () =>
    api<AdminUserList>(
      `/api/admin/users${qs({ role: "EXAMINER", pageSize: 100 })}`,
    ),
  create: (input: CreateUserInput) =>
    api<IssuedCredentials>("/api/admin/users", { method: "POST", body: input }),
  update: (userId: string, input: UpdateUserInput) =>
    api<AdminUser>(`/api/admin/users/${userId}`, {
      method: "PATCH",
      body: input,
    }),
  resetPassword: (userId: string) =>
    api<IssuedCredentials>(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
    }),
};
