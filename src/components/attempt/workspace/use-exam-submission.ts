"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clearLocalSketch } from "./sketch-storage";
import { ApiClientError, attemptsApi } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { SubmitResult } from "@/shared/schemas/attempt";

const AUTO_SUBMIT_RETRY_MS = 4000;

/**
 * Manual and time-up submission. Both paths flush the durable answer queue
 * first and never submit while answers exist only on this device.
 */
export function useExamSubmission({
  attemptId,
  flushQueue,
  cancelScheduledFlush,
}: {
  attemptId: string;
  flushQueue: () => Promise<number>;
  cancelScheduledFlush: () => void;
}) {
  const qc = useQueryClient();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [offlineBlock, setOfflineBlock] = useState(0);
  const [submittedResult, setSubmittedResult] = useState<SubmitResult | null>(
    null,
  );

  const autoRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest autoSubmit, so a retry timer or reconnect never runs a stale one.
  const autoSubmitRef = useRef<() => Promise<void>>(async () => {});
  const autoSubmitStartedRef = useRef(false);

  function onSubmitted(res: SubmitResult) {
    setConfirmSubmit(false);
    setTimeUp(false);
    setSubmittedResult(res);
    clearLocalSketch(attemptId);
    qc.invalidateQueries({ queryKey: qk.attempts.detail(attemptId) });
    qc.invalidateQueries({ queryKey: qk.myExams });
    toast.success(
      res.submitReason === "TIMEOUT"
        ? "Time is up. Your attempt has been submitted."
        : "Exam submitted.",
    );
  }

  const submitMutation = useMutation({
    mutationFn: () => attemptsApi.submit(attemptId),
    onSuccess: (res) => onSubmitted(res),
    onError: (e) => {
      setSubmitting(false);
      setConfirmSubmit(false);
      toast.error(e.message);
    },
  });

  // Flush the durable queue first. Never submit while answers exist only on this device.
  const flushAllAndSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    cancelScheduledFlush();
    const remaining = await flushQueue();
    if (remaining > 0) {
      // Release the guard so "Try again" can re-run this after reconnecting.
      setSubmitting(false);
      setConfirmSubmit(false);
      setOfflineBlock(remaining);
      return;
    }
    submitMutation.mutate();
  }, [cancelScheduledFlush, flushQueue, submitMutation, submitting]);

  // Time-up: sync, then submit; keep retrying quietly while offline. The server
  // also finalises lazily at the deadline, so nothing is lost if this never succeeds.
  const autoSubmit = useCallback(async () => {
    autoSubmitStartedRef.current = true;
    setTimeUp(true);
    const retry = () => {
      if (autoRetryRef.current) clearTimeout(autoRetryRef.current);
      autoRetryRef.current = setTimeout(
        () => void autoSubmitRef.current(),
        AUTO_SUBMIT_RETRY_MS,
      );
    };
    const remaining = await flushQueue();
    if (remaining > 0) return retry();
    try {
      const res = await attemptsApi.submit(attemptId);
      onSubmitted(res);
    } catch (e) {
      if (e instanceof ApiClientError && e.status !== 0) {
        // Server already finalised it (e.g. 409): show the submitted state.
        qc.invalidateQueries({ queryKey: qk.attempts.detail(attemptId) });
        return;
      }
      retry();
    }
    // onSubmitted only touches state setters and the query client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, flushQueue, qc]);

  useEffect(() => {
    autoSubmitRef.current = autoSubmit;
  }, [autoSubmit]);

  useEffect(
    () => () => {
      if (autoRetryRef.current) clearTimeout(autoRetryRef.current);
    },
    [],
  );

  /** True once time-up auto-submit has begun; it then owns submission. */
  const hasAutoSubmitStarted = useCallback(
    () => autoSubmitStartedRef.current,
    [],
  );
  const retryAutoSubmit = useCallback(() => {
    void autoSubmitRef.current();
  }, []);

  return {
    confirmSubmit,
    setConfirmSubmit,
    submitting: submitting || submitMutation.isPending,
    timeUp,
    offlineBlock,
    setOfflineBlock,
    submittedResult,
    flushAllAndSubmit,
    autoSubmit,
    hasAutoSubmitStarted,
    retryAutoSubmit,
  };
}
