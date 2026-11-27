"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CHECKS,
  runningChecks,
  type Check,
  type CheckId,
  type CheckResults,
} from "./check-definitions";
import {
  checkAutosave,
  checkFullscreen,
  checkStorage,
  clockVerdict,
  measureNetwork,
  networkVerdict,
} from "./probes";

/**
 * Pre-exam device checks. Runs once on mount; `ready` is true when every required check
 * passed (or only warned). Advisory checks never block the start.
 */
export function useSystemChecks() {
  const [checks, setChecks] = useState<CheckResults>(runningChecks);

  const run = useCallback(async (reset: boolean) => {
    if (reset) setChecks(runningChecks());
    const set = (id: CheckId, c: Check) =>
      setChecks((s) => ({ ...s, [id]: c }));

    set("fullscreen", checkFullscreen());

    void checkStorage().then((c) => set("storage", c));

    try {
      const { rtt, skew } = await measureNetwork();
      set("network", networkVerdict(rtt));
      set("clock", clockVerdict(skew));
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

export type SystemChecksState = ReturnType<typeof useSystemChecks>;
