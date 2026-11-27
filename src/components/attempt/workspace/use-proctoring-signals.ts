"use client";
import { useEffect } from "react";
import { attemptsApi } from "@/lib/api";
import type { AttemptStatus } from "@/shared/schemas/attempt";
import type { IncidentType } from "@/shared/schemas/monitoring";

/** Advisory browser-signal listeners (never penalize; skipped in sandbox). */
export function useProctoringSignals({
  attemptId,
  status,
  isSandbox,
  submitted,
}: {
  attemptId: string;
  status: AttemptStatus;
  isSandbox: boolean;
  submitted: boolean;
}) {
  useEffect(() => {
    if (status !== "IN_PROGRESS" || isSandbox || submitted) return;
    const report = (type: IncidentType) => {
      void attemptsApi.reportIncident(attemptId, type).catch(() => {});
    };
    const onVis = () => {
      if (document.hidden) report("TAB_HIDDEN");
    };
    const onBlur = () => report("WINDOW_BLUR");
    const onCopyPaste = () => report("COPY_PASTE");
    const onFs = () => {
      if (!document.fullscreenElement) report("FULLSCREEN_EXIT");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopyPaste);
    document.addEventListener("paste", onCopyPaste);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopyPaste);
      document.removeEventListener("paste", onCopyPaste);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [status, isSandbox, attemptId, submitted]);
}
