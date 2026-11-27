"use client";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Monotonic clock anchor: serverNowMs + (performance.now() - anchorPerfMs).
 * Immune to the candidate changing their system clock.
 */
export type ServerClock = {
  serverNowMs: number;
  anchorPerfMs: number;
  deadlineMs: number;
};

export type ServerClockRef = RefObject<ServerClock | null>;

export function estimateServerNowMs(clk: ServerClock) {
  return clk.serverNowMs + (performance.now() - clk.anchorPerfMs);
}

/**
 * Holds the clock anchor in a ref (not state) so the 500ms tick and answer
 * timestamps never trigger re-renders. Re-anchors whenever the attempt is
 * refetched; the heartbeat also writes to it to pick up time extensions.
 */
export function useServerClock(serverNow: string, deadlineAt: string) {
  const clockRef = useRef<ServerClock | null>(null);

  useEffect(() => {
    clockRef.current = {
      serverNowMs: Date.parse(serverNow),
      anchorPerfMs: performance.now(),
      deadlineMs: Date.parse(deadlineAt),
    };
  }, [serverNow, deadlineAt]);

  return clockRef;
}
