"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usersApi, type IssuedCredentials } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Role } from "@/shared/schemas/auth";

/** Admin edits to another user's account: role / active flag, and password reset. */
export function useUserMutations({
  onUpdated,
  onUpdateFailed,
  onPasswordReset,
  onPasswordResetFailed,
}: {
  onUpdated: () => void;
  onUpdateFailed: () => void;
  onPasswordReset: (r: IssuedCredentials) => void;
  onPasswordResetFailed: () => void;
}) {
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: (v: { id: string; role?: Role; isActive?: boolean }) =>
      usersApi.update(v.id, { role: v.role, isActive: v.isActive }),
    onSuccess: () => {
      toast.success("User updated");
      onUpdated();
      qc.invalidateQueries({ queryKey: qk.users.all });
      qc.invalidateQueries({ queryKey: qk.users.examiners });
    },
    onError: (e) => {
      onUpdateFailed();
      toast.error(e.message);
    },
  });

  const resetPassword = useMutation({
    mutationFn: usersApi.resetPassword,
    onSuccess: onPasswordReset,
    onError: (e) => {
      onPasswordResetFailed();
      toast.error(e.message);
    },
  });

  return { update, resetPassword };
}
