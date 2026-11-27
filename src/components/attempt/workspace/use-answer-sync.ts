"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  enqueueAnswer,
  getQueuedAnswers,
  removeQueuedAnswers,
} from "@/lib/offline-queue";
import { attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { AttemptState } from "@/shared/schemas/attempt";
import {
  buildInitialDrafts,
  emptyDraft,
  type DraftAnswer,
  type UpdateDraft,
} from "./draft-answer";
import { estimateServerNowMs, type ServerClockRef } from "./use-server-clock";

export type SaveChip = "saved" | "saving" | "unsaved" | "error";

const FLUSH_DEBOUNCE_MS = 600;
const BACKOFF_START_MS = 2000;
const BACKOFF_MAX_MS = 15_000;

/**
 * Offline-first answer store. Every edit is written to the durable IndexedDB
 * queue first, then flushed to the server (debounced, with exponential backoff
 * on failure). `flushQueue` resolves to the number of answers still only on
 * this device, which callers use to refuse submission until it reaches 0.
 */
export function useAnswerSync(attempt: AttemptState, clockRef: ServerClockRef) {
  const attemptId = attempt.id;
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>(() =>
    buildInitialDrafts(attempt),
  );
  const [saveChip, setSaveChip] = useState<SaveChip>("saved");
  const [queuedCount, setQueuedCount] = useState(0);

  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest flushQueue, so a backoff retry scheduled earlier never runs a stale one.
  const flushRef = useRef<() => Promise<number>>(async () => 0);
  const wasFailingRef = useRef(false);
  const backoffRef = useRef(BACKOFF_START_MS);
  const syncingRef = useRef(false);
  const startedAtMs = Date.parse(attempt.startedAt);

  const flushQueue = useCallback(async (): Promise<number> => {
    if (syncingRef.current) return (await getQueuedAnswers(attemptId)).length;
    const queued = await getQueuedAnswers(attemptId);
    setQueuedCount(queued.length);
    if (queued.length === 0) {
      setSaveChip("saved");
      return 0;
    }
    syncingRef.current = true;
    setSaveChip("saving");
    try {
      const res = await attemptsApi.sync(
        attemptId,
        queued.map((q) => ({
          attemptQuestionId: q.attemptQuestionId,
          selectedOptionIds: q.selectedOptionIds,
          textAnswer: q.textAnswer,
          markedForReview: q.markedForReview,
          seq: q.seq,
          capturedElapsedMs: q.capturedElapsedMs,
        })),
      );
      backoffRef.current = BACKOFF_START_MS;
      const doneKeys = queued.map((q) => q.key);
      await removeQueuedAnswers(attemptId, doneKeys);
      const remaining = await getQueuedAnswers(attemptId);
      setQueuedCount(remaining.length);
      setSaveChip(remaining.length === 0 ? "saved" : "unsaved");
      if (wasFailingRef.current) {
        wasFailingRef.current = false;
        const synced = queued.length - res.rejected;
        if (synced > 0)
          toast.success(
            `${synced} answer${synced === 1 ? "" : "s"} synced to the server`,
          );
      }

      if (res.acceptedLate > 0) {
        toast.info(
          `${res.acceptedLate} offline answer(s) recovered within the recovery window and flagged for examiner review.`,
        );
      }
      if (res.rejected > 0) {
        toast.error(
          `${res.rejected} answer(s) could not be accepted after the deadline.`,
        );
      }
      if (res.attemptStatus === "SUBMITTED") {
        qc.invalidateQueries({ queryKey: qk.attempts.detail(attemptId) });
      }
      return remaining.length;
    } catch {
      wasFailingRef.current = true;
      setSaveChip("error");
      // Schedule exponential backoff retry (2s -> 4s -> 8s -> 15s).
      const delay = backoffRef.current;
      backoffRef.current = Math.min(BACKOFF_MAX_MS, delay * 2);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(() => {
        void flushRef.current();
      }, delay);
      return queued.length;
    } finally {
      syncingRef.current = false;
    }
  }, [attemptId, qc]);

  useEffect(() => {
    flushRef.current = flushQueue;
  }, [flushQueue]);

  // Hydrate any durable offline answers from IndexedDB on load/refresh, then flush.
  useEffect(() => {
    let alive = true;
    void getQueuedAnswers(attemptId).then((queued) => {
      if (!alive || queued.length === 0) return;
      setQueuedCount(queued.length);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const q of queued) {
          const cur = next[q.attemptQuestionId];
          if (!cur || q.seq > cur.seq) {
            next[q.attemptQuestionId] = {
              selectedOptionIds: q.selectedOptionIds,
              textAnswer: q.textAnswer,
              markedForReview: q.markedForReview,
              seq: q.seq,
            };
          }
        }
        return next;
      });
      void flushQueue();
    });
    return () => {
      alive = false;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [attemptId, flushQueue]);

  // Write locally to IndexedDB first, then debounce network flush (~600ms).
  const updateDraft: UpdateDraft = useCallback(
    (aqId, updater) => {
      setDrafts((prev) => {
        const cur = prev[aqId] ?? emptyDraft();
        const next: DraftAnswer = { ...updater(cur), seq: cur.seq + 1 };
        const clk = clockRef.current;
        const estServerNow = clk ? estimateServerNowMs(clk) : Date.now();
        const capturedElapsedMs = Math.max(
          0,
          Math.round(estServerNow - startedAtMs),
        );

        setSaveChip("unsaved");
        void enqueueAnswer({
          key: `${attemptId}:${aqId}`,
          attemptId,
          attemptQuestionId: aqId,
          selectedOptionIds: next.selectedOptionIds,
          textAnswer: next.textAnswer,
          markedForReview: next.markedForReview,
          seq: next.seq,
          capturedElapsedMs,
        }).then(async () => {
          const q = await getQueuedAnswers(attemptId);
          setQueuedCount(q.length);
        });

        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = setTimeout(() => {
          void flushQueue();
        }, FLUSH_DEBOUNCE_MS);
        return { ...prev, [aqId]: next };
      });
    },
    [attemptId, clockRef, flushQueue, startedAtMs],
  );

  /** Drop a pending debounce/backoff timer (the caller is about to flush now). */
  const cancelScheduledFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  /** Back to the 2s first retry, e.g. after the connection comes back. */
  const resetBackoff = useCallback(() => {
    backoffRef.current = BACKOFF_START_MS;
  }, []);

  return {
    drafts,
    saveChip,
    queuedCount,
    flushQueue,
    updateDraft,
    cancelScheduledFlush,
    resetBackoff,
  };
}
