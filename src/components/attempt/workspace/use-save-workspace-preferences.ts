"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { preferencesApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import {
  DEFAULT_PREFERENCES,
  type WorkspacePreferences,
} from "@/shared/schemas/secondary";

/** Saves a preferences patch, applying it optimistically and rolling back on error. */
export function useSaveWorkspacePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<WorkspacePreferences>) =>
      preferencesApi.update(patch),
    onMutate: (patch) => {
      // Optimistic: whatever is behind the form updates instantly.
      const prev = qc.getQueryData<WorkspacePreferences>(qk.preferences);
      qc.setQueryData(qk.preferences, { ...(prev ?? DEFAULT_PREFERENCES), ...patch });
      return { prev };
    },
    onSuccess: (next) => qc.setQueryData(qk.preferences, next),
    onError: (e, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.preferences, ctx.prev);
      toast.error(e.message);
    },
  });
}
