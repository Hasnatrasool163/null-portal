import { api } from "./client";
import type { LoginInput } from "@/shared/schemas/auth";
import type { WorkspacePreferences } from "@/shared/schemas/secondary";
import type { NotificationList } from "@/shared/schemas/notification";

/** Session and the signed-in user's own account. */
export const authApi = {
  login: (input: LoginInput) =>
    api("/api/auth/login", { method: "POST", body: input }),
  logout: () => api("/api/auth/logout", { method: "POST" }),
  me: () => api("/api/auth/me"),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api("/api/auth/change-password", { method: "POST", body: input }),
};

export const preferencesApi = {
  get: () => api<WorkspacePreferences>("/api/me/preferences"),
  update: (patch: Partial<WorkspacePreferences>) =>
    api<WorkspacePreferences>("/api/me/preferences", {
      method: "PATCH",
      body: patch,
    }),
};

export const notificationsApi = {
  list: () => api<NotificationList>("/api/notifications"),
  /** Omit `ids` to mark every notification read. */
  markRead: (ids?: string[]) =>
    api("/api/notifications/read", {
      method: "POST",
      body: ids ? { ids } : {},
    }),
};
