"use client";
import { useEffect, useRef, useState } from "react";
import type { AttemptState, SubmitResult } from "@/shared/schemas/attempt";
import { estimateServerNowMs, type ServerClockRef } from "./use-server-clock";

const TICK_MS = 500;
const ANNOUNCE_AT_MINUTES = [10, 5, 1];

/**
 * Monotonic countdown tick + screen-reader threshold announcements. Calls
 * `onTimeUp` exactly once when the server deadline passes.
 */
export function useExamClock({
  attempt,
  submittedResult,
  clockRef,
  onTimeUp,
}: {
  attempt: AttemptState;
  submittedResult: SubmitResult | null;
  clockRef: ServerClockRef;
  onTimeUp: () => Promise<void>;
}) {
  const [remainingMs, setRemainingMs] = useState<number>(() =>
    Math.max(0, Date.parse(attempt.deadlineAt) - Date.parse(attempt.serverNow)),
  );
  const [announcement, setAnnouncement] = useState("");
  const announcedThresholdsRef = useRef<Set<number>>(new Set());
  const timeUpFiredRef = useRef(false);

  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS" || submittedResult) return;
    const id = setInterval(() => {
      const clk = clockRef.current;
      if (!clk) return;
      const left = Math.max(0, clk.deadlineMs - estimateServerNowMs(clk));
      setRemainingMs(left);

      const sec = Math.ceil(left / 1000);
      for (const mins of ANNOUNCE_AT_MINUTES) {
        if (sec <= mins * 60 && !announcedThresholdsRef.current.has(mins)) {
          announcedThresholdsRef.current.add(mins);
          setAnnouncement(
            mins === 1
              ? "1 minute remaining in this exam."
              : `${mins} minutes remaining in this exam.`,
          );
        }
      }
      if (left <= 0 && !timeUpFiredRef.current) {
        timeUpFiredRef.current = true;
        setAnnouncement("Time is up. Submitting your exam.");
        void onTimeUp();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [attempt, submittedResult, clockRef, onTimeUp]);

  return { remainingMs, announcement };
}
