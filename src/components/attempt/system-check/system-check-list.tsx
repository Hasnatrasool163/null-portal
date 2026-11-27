"use client";
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { CHECKS, type CheckStatus } from "./check-definitions";
import type { SystemChecksState } from "./use-system-checks";

/** Full system check: one row per check with its label, detail and status. */
export function SystemCheckList({ state }: { state: SystemChecksState }) {
  const { checks, busy, ready, rerun } = state;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">System check</p>
        <Button variant="ghost" size="sm" disabled={busy} onClick={rerun}>
          <RotateCcw className="h-3.5 w-3.5" />
          Run again
        </Button>
      </div>
      <ul className="space-y-1.5" aria-live="polite">
        {CHECKS.map(({ id, label, icon: Icon, required }) => {
          const c = checks[id];
          return (
            <li
              key={id}
              className="flex items-start gap-2.5 rounded-lg border px-3 py-2"
            >
              <Icon
                className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {label}
                  {!required && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      (advisory)
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs">{c.detail}</p>
              </div>
              <StatusIcon status={c.status} />
            </li>
          );
        })}
      </ul>
      {!busy && !ready && (
        <p className="text-destructive text-xs" role="alert">
          Fix the failed checks (usually your connection), then run them again.
        </p>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "running")
    return <Spinner className="text-muted-foreground" />;
  if (status === "pass")
    return (
      <CheckCircle2 className="text-success h-4 w-4" aria-label="Passed" />
    );
  if (status === "warn")
    return (
      <AlertTriangle className="text-warning h-4 w-4" aria-label="Warning" />
    );
  return <XCircle className="text-destructive h-4 w-4" aria-label="Failed" />;
}
