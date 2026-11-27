"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";

/**
 * The signed-in user's notifications. Polls every minute (reminders such as "closing soon"
 * are generated server-side on each read). `markRead()` with no ids marks everything read.
 */
export function useNotifications() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.notifications,
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const markRead = useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
  return { query, markRead };
}
