"use client";
import { useQuery } from "@tanstack/react-query";
import { preferencesApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { DEFAULT_PREFERENCES } from "@/shared/schemas/secondary";

/** Server-persisted workspace preferences (they follow the user across devices). */
export function useWorkspacePreferences() {
  const query = useQuery({
    queryKey: qk.preferences,
    queryFn: () => preferencesApi.get(),
  });
  return { prefs: query.data ?? DEFAULT_PREFERENCES, isLoading: query.isPending };
}
