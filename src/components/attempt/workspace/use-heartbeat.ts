"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { AttemptStatus } from "@/shared/schemas/attempt";
import type { AnnouncementItem } from "@/shared/schemas/monitoring";
import type { ServerClockRef } from "./use-server-clock";

const HEARTBEAT_MS = 10_000;

/**
 * Heartbeat (~10s): updates last_seen_at, re-anchors the server clock (picks
 * up time extensions) and returns the examiner's current announcements.
 */
export function useHeartbeat({
  attemptId,
  status,
  submitted,
  clockRef,
}: {
  attemptId: string;
  status: AttemptStatus;
  submitted: boolean;
  clockRef: ServerClockRef;
}) {
  const qc = useQueryClient();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  useEffect(() => {
    if (status !== "IN_PROGRESS" || submitted) return;
    let active = true;
    async function beat() {
      try {
        const res = await attemptsApi.heartbeat(attemptId);
        if (!active) return;
        const newDeadline = Date.parse(res.deadlineAt);
        const prevDeadline = clockRef.current?.deadlineMs;
        clockRef.current = {
          serverNowMs: Date.parse(res.serverNow),
          anchorPerfMs: performance.now(),
          deadlineMs: newDeadline,
        };
        if (prevDeadline && newDeadline > prevDeadline) {
          toast.info("Your examiner granted additional time.");
        }
        setAnnouncements(res.announcements);
        if (res.status === "SUBMITTED") {
          qc.invalidateQueries({ queryKey: qk.attempts.detail(attemptId) });
        }
      } catch {
        // Network drops are handled gracefully without interrupting the candidate.
      }
    }
    void beat();
    const id = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [status, attemptId, qc, submitted, clockRef]);

  return announcements;
}
