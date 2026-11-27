"use client";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { attemptsApi } from "@/lib/api";

/**
 * Network monitor for a live attempt: reports disconnect/reconnect incidents
 * (skipped in sandbox) and lets the caller resume syncing on reconnect.
 */
export function useAttemptNetwork({
  attemptId,
  isSandbox,
  enabled,
  onReconnect,
}: {
  attemptId: string;
  isSandbox: boolean;
  enabled: boolean;
  onReconnect: () => void;
}) {
  return useNetworkStatus({
    enabled,
    onDisconnect: () => {
      if (!isSandbox) {
        void attemptsApi
          .reportIncident(attemptId, "DISCONNECT")
          .catch(() => {});
      }
    },
    onReconnect: (offlineSeconds) => {
      onReconnect();
      if (!isSandbox) {
        void attemptsApi
          .reportIncident(attemptId, "RECONNECT", { offlineSeconds })
          .catch(() => {});
      }
    },
  });
}
