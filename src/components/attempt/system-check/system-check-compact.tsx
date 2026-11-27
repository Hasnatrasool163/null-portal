"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Spinner } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { plural } from "@/lib/format";
import { CHECKS, SHORT_LABEL, type CheckStatus } from "./check-definitions";
import type { SystemChecksState } from "./use-system-checks";

/**
 * Compact system check for tight spaces (the start-exam dialog): one summary
 * line plus status chips. Each chip's detail is in a tooltip; failures stay visible.
 */
export function SystemCheckCompact({ state }: { state: SystemChecksState }) {
  const { checks, busy, ready, rerun } = state;
  const [open, setOpen] = useState(false);
  const failed = CHECKS.filter((c) => checks[c.id].status === "fail");
  const warned = CHECKS.filter((c) => checks[c.id].status === "warn");
  const expanded = open || (!busy && !ready);
  const summary = busy
    ? "Checking your device…"
    : !ready
      ? `${plural(failed.length, "check")} failed`
      : warned.length > 0
        ? `Ready · ${plural(warned.length, "advisory note")}`
        : "All checks passed";

  return (
    <div className="rounded-lg border" aria-live="polite">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {busy ? (
          <Spinner className="text-muted-foreground" />
        ) : !ready ? (
          <XCircle className="text-destructive h-4 w-4" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="text-success h-4 w-4" aria-hidden="true" />
        )}
        <p className="flex-1 text-sm">
          <span className="font-medium">System check</span>
          <span className="text-muted-foreground"> · {summary}</span>
        </p>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
        >
          {expanded ? "Hide" : "Details"}
        </button>
      </div>
      {expanded && (
        <div className="animate-page-in space-y-2 border-t px-3 py-2.5">
          <ul className="flex flex-wrap gap-1.5">
            {CHECKS.map(({ id, required }) => {
              const c = checks[id];
              return (
                <li key={id}>
                  <Tooltip content={c.detail}>
                    <span
                      tabIndex={0}
                      className={
                        "focus-visible:ring-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:outline-none " +
                        (c.status === "fail"
                          ? "border-destructive/40 bg-destructive/5"
                          : c.status === "warn"
                            ? "border-warning/40 bg-warning/5"
                            : "bg-card")
                      }
                    >
                      <ChipIcon status={c.status} />
                      {SHORT_LABEL[id]}
                      {!required && <span className="sr-only">(advisory)</span>}
                    </span>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <p
              className={
                !busy && !ready
                  ? "text-destructive text-xs"
                  : "text-muted-foreground text-xs"
              }
            >
              {!busy && !ready
                ? failed.map((f) => checks[f.id].detail).join(" ")
                : "Hover a check for details."}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={rerun}
              className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Run again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipIcon({ status }: { status: CheckStatus }) {
  if (status === "running")
    return <Spinner className="text-muted-foreground h-3 w-3" />;
  if (status === "pass")
    return (
      <CheckCircle2 className="text-success h-3.5 w-3.5" aria-label="Passed" />
    );
  if (status === "warn")
    return (
      <AlertTriangle
        className="text-warning h-3.5 w-3.5"
        aria-label="Warning"
      />
    );
  return (
    <XCircle className="text-destructive h-3.5 w-3.5" aria-label="Failed" />
  );
}
