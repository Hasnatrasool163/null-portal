"use client";
import { useEffect, useRef, useState } from "react";

export type NetworkState = "online" | "unstable" | "offline";

/**
 * Shared network-aware monitor used by both the Exam Workspace banner (Secondary #1)
 * and the Failure-Resilient Offline Queue (Innovation 5.3).
 */
export function useNetworkStatus(opts?: {
  enabled?: boolean;
  onDisconnect?: () => void;
  onReconnect?: (offlineSeconds: number) => void;
}) {
  const enabled = opts?.enabled ?? true;
  const [state, setState] = useState<NetworkState>("online");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const stateRef = useRef<NetworkState>("online");
  const offlineSinceRef = useRef<number | null>(null);
  const cbRef = useRef(opts);

  useEffect(() => {
    cbRef.current = opts;
  }, [opts]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const markOffline = () => {
      if (stateRef.current !== "offline") {
        stateRef.current = "offline";
        offlineSinceRef.current = performance.now();
        setState("offline");
        setLatencyMs(null);
        cbRef.current?.onDisconnect?.();
      }
    };

    const markOnline = (ms: number) => {
      const next: NetworkState = ms > 1500 ? "unstable" : "online";
      const wasOffline = stateRef.current === "offline";
      stateRef.current = next;
      setState(next);
      setLatencyMs(ms);
      if (wasOffline) {
        const secs = offlineSinceRef.current
          ? Math.max(1, Math.round((performance.now() - offlineSinceRef.current) / 1000))
          : 1;
        offlineSinceRef.current = null;
        cbRef.current?.onReconnect?.(secs);
      }
    };

    async function ping() {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        markOffline();
        return;
      }
      const start = performance.now();
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 3500);
      try {
        const res = await fetch("/api/ping", {
          cache: "no-store",
          signal: ctrl.signal,
        });
        clearTimeout(timeout);
        if (cancelled) return;
        if (!res.ok) markOffline();
        else markOnline(Math.round(performance.now() - start));
      } catch {
        clearTimeout(timeout);
        if (!cancelled) markOffline();
      }
    }

    const onOfflineEvt = () => markOffline();
    const onOnlineEvt = () => void ping();

    window.addEventListener("offline", onOfflineEvt);
    window.addEventListener("online", onOnlineEvt);
    void ping();
    const id = setInterval(() => void ping(), 5000);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("offline", onOfflineEvt);
      window.removeEventListener("online", onOnlineEvt);
    };
  }, [enabled]);

  return { state, latencyMs };
}
