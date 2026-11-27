"use client";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Maximize,
  RotateCcw,
  Save,
  Wifi,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import {
  enqueueAnswer,
  getQueuedAnswers,
  removeQueuedAnswers,
} from "@/lib/offline-queue";

type Status = "running" | "pass" | "warn" | "fail";
type Check = { status: Status; detail: string };
type CheckId = "network" | "clock" | "storage" | "fullscreen" | "autosave";

const SHORT: Record<CheckId, string> = {
  network: "Connection",
  autosave: "Autosave",
  storage: "Offline storage",
  clock: "Device clock",
  fullscreen: "Fullscreen",
};

const CHECKS: {
  id: CheckId;
  label: string;
  icon: typeof Wifi;
  required: boolean;
}[] = [
  {
    id: "network",
    label: "Connection to exam server",
    icon: Wifi,
    required: true,
  },
  { id: "autosave", label: "Autosave test", icon: Save, required: true },
  {
    id: "storage",
    label: "Offline answer storage",
    icon: HardDrive,
    required: false,
  },
  { id: "clock", label: "Device clock", icon: Clock, required: false },
  {
    id: "fullscreen",
    label: "Fullscreen support",
    icon: Maximize,
    required: false,
  },
];

const running = (): Record<CheckId, Check> => ({
  network: { status: "running", detail: "Measuring…" },
  autosave: { status: "running", detail: "Saving a test answer…" },
  storage: { status: "running", detail: "Writing a test record…" },
  clock: { status: "running", detail: "Comparing with server time…" },
  fullscreen: { status: "running", detail: "Checking…" },
});

async function checkNetwork() {
  const samples: { rtt: number; skew: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const p0 = performance.now();
    const r = await api<{ serverNow: string }>(`/api/ping?ts=${p0}`, {
      cache: "no-store",
    });
    const rtt = performance.now() - p0;
    samples.push({ rtt, skew: Date.parse(r.serverNow) - (t0 + rtt / 2) });
  }
  samples.sort((a, b) => a.rtt - b.rtt);
  return samples[1]; // median by RTT
}

async function checkStorage(): Promise<Check> {
  const attemptId = "__system_check__";
  const key = `${attemptId}:probe`;
  try {
    await enqueueAnswer({
      key,
      attemptId,
      attemptQuestionId: "probe",
      selectedOptionIds: [1],
      textAnswer: "probe",
      markedForReview: false,
      seq: 1,
      capturedElapsedMs: 0,
    });
    const back = await getQueuedAnswers(attemptId);
    await removeQueuedAnswers(attemptId, [key]);
    if (!back.some((q) => q.key === key)) throw new Error("read-back failed");
    return {
      status: "pass",
      detail: "Answers will be kept on this device if the connection drops.",
    };
  } catch {
    return {
      status: "warn",
      detail:
        "This browser blocks local storage (private mode?). Answers still save online, but not while offline.",
    };
  }
}

async function checkAutosave(): Promise<Check> {
  const nonce = crypto.randomUUID();
  const payload = "x".repeat(4000);
  try {
    const r = await api<{ nonce: string; receivedBytes: number }>(
      "/api/system-check",
      {
        method: "POST",
        body: { nonce, payload },
      },
    );
    if (r.nonce !== nonce || r.receivedBytes !== payload.length) {
      return {
        status: "fail",
        detail: "The server did not receive the test answer intact.",
      };
    }
    return {
      status: "pass",
      detail: "A test answer was saved and confirmed by the server.",
    };
  } catch (e) {
    return { status: "fail", detail: (e as Error).message };
  }
}

/**
 * Pre-exam device checks. Runs once on mount; `ready` is true when every required check
 * passed (or only warned). Advisory checks never block the start.
 */
export function useSystemChecks() {
  const [checks, setChecks] = useState<Record<CheckId, Check>>(running);

  const run = useCallback(async (reset: boolean) => {
    if (reset) setChecks(running());
    const set = (id: CheckId, c: Check) =>
      setChecks((s) => ({ ...s, [id]: c }));

    const fsOk =
      typeof document !== "undefined" &&
      !!document.fullscreenEnabled &&
      typeof document.documentElement.requestFullscreen === "function";
    set(
      "fullscreen",
      fsOk
        ? {
            status: "pass",
            detail: "Supported. You can go fullscreen to reduce distractions.",
          }
        : {
            status: "warn",
            detail:
              "Not supported on this device. The exam still works normally.",
          },
    );

    void checkStorage().then((c) => set("storage", c));

    try {
      const { rtt, skew } = await checkNetwork();
      set(
        "network",
        rtt > 1500
          ? {
              status: "warn",
              detail: `Slow connection (${Math.round(rtt)} ms). Answers are queued and retried automatically.`,
            }
          : {
              status: "pass",
              detail: `Connected · ${Math.round(rtt)} ms round trip`,
            },
      );
      const skewSec = Math.round(Math.abs(skew) / 1000);
      set(
        "clock",
        skewSec > 30
          ? {
              status: "warn",
              detail: `Your device clock is off by ~${skewSec}s. That's fine: the timer uses server time, so changing your clock has no effect.`,
            }
          : {
              status: "pass",
              detail:
                "In sync with the server. The timer always uses server time.",
            },
      );
      set("autosave", await checkAutosave());
    } catch (e) {
      const msg = (e as Error).message;
      set("network", { status: "fail", detail: msg });
      set("clock", {
        status: "warn",
        detail: "Could not reach the server to compare.",
      });
      set("autosave", { status: "fail", detail: "Skipped: no connection." });
    }
  }, []);

  // Mount the owner fresh per exam (key it), so the checks run once when it opens.
  useEffect(() => {
    const t = setTimeout(() => void run(false), 0);
    return () => clearTimeout(t);
  }, [run]);

  const busy = CHECKS.some((c) => checks[c.id].status === "running");
  const ready =
    !busy &&
    CHECKS.filter((c) => c.required).every(
      (c) => checks[c.id].status === "pass" || checks[c.id].status === "warn",
    );
  return { checks, busy, ready, rerun: () => void run(true) };
}

export function SystemCheckList({
  state,
}: {
  state: ReturnType<typeof useSystemChecks>;
}) {
  const { checks, busy, ready, rerun } = state;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">
          System check
        </p>
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

function StatusIcon({ status }: { status: Status }) {
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

/**
 * Compact system check for tight spaces (the start-exam dialog): one summary
 * line plus status chips. Each chip's detail is in a tooltip; failures stay visible.
 */
export function SystemCheckCompact({
  state,
}: {
  state: ReturnType<typeof useSystemChecks>;
}) {
  const { checks, busy, ready, rerun } = state;
  const [open, setOpen] = useState(false);
  const failed = CHECKS.filter((c) => checks[c.id].status === "fail");
  const warned = CHECKS.filter((c) => checks[c.id].status === "warn");
  const expanded = open || (!busy && !ready);
  const summary = busy
    ? "Checking your device…"
    : !ready
      ? `${failed.length} check${failed.length === 1 ? "" : "s"} failed`
      : warned.length > 0
        ? `Ready · ${warned.length} advisory note${warned.length === 1 ? "" : "s"}`
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
                      {SHORT[id]}
                      {!required && <span className="sr-only">(advisory)</span>}
                    </span>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <p className={!busy && !ready ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
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

function ChipIcon({ status }: { status: Status }) {
  if (status === "running")
    return <Spinner className="text-muted-foreground h-3 w-3" />;
  if (status === "pass")
    return <CheckCircle2 className="text-success h-3.5 w-3.5" aria-label="Passed" />;
  if (status === "warn")
    return <AlertTriangle className="text-warning h-3.5 w-3.5" aria-label="Warning" />;
  return <XCircle className="text-destructive h-3.5 w-3.5" aria-label="Failed" />;
}
