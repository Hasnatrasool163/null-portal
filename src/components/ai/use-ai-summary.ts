"use client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

/**
 * Cached-or-generate lifecycle shared by every AI summary card: load the last
 * stored summary (null if none yet), and (re)generate on demand, writing the
 * fresh result straight into the cache.
 */
export function useAiSummary<T>({
  queryKey,
  fetchCached,
  generate,
}: {
  queryKey: QueryKey;
  fetchCached: () => Promise<T | null>;
  generate: (refresh: boolean) => Promise<T>;
}) {
  const qc = useQueryClient();
  const cached = useQuery({ queryKey, queryFn: fetchCached });
  const mutation = useMutation({
    mutationFn: generate,
    onSuccess: (res) => {
      qc.setQueryData(queryKey, res);
    },
  });

  return {
    data: mutation.data ?? cached.data ?? null,
    isInitialLoading: cached.isPending,
    isGenerating: mutation.isPending,
    errorMessage: mutation.isError ? mutation.error.message : null,
    generate: (refresh: boolean) => mutation.mutate(refresh),
  };
}
