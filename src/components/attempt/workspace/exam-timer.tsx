"use client";
import { Clock } from "lucide-react";
import { formatClock } from "@/lib/format";
import type { WorkspacePreferences } from "@/shared/schemas/secondary";

/** Countdown chip that escalates in colour at 10, 5 and 1 minute(s) left. */
export function ExamTimer({
  remainingMs: ms,
  timerStyle,
}: {
  remainingMs: number;
  timerStyle: WorkspacePreferences["timerStyle"];
}) {
  const urgency =
    ms <= 60_000
      ? "border-destructive bg-destructive/15 text-destructive"
      : ms <= 5 * 60_000
        ? "border-warning bg-warning/15 text-warning"
        : ms <= 10 * 60_000
          ? "border-warning/60 bg-warning/10 text-warning"
          : "border-border bg-card text-foreground";

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm font-semibold ${urgency} ${
        timerStyle === "subtle" && ms > 5 * 60_000 ? "opacity-70" : ""
      }`}
      aria-label={`Time remaining ${formatClock(ms)}`}
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span>{formatClock(ms)}</span>
      {ms <= 60_000 && (
        <span className="font-sans text-xs font-medium">· &lt;1 min</span>
      )}
      {ms > 60_000 && ms <= 5 * 60_000 && (
        <span className="font-sans text-xs font-medium">· &lt;5 min</span>
      )}
    </div>
  );
}
