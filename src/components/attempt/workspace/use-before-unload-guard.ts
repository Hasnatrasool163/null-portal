"use client";
import { useEffect } from "react";

/** Warn before leaving while answers exist only on this device. */
export function useBeforeUnloadGuard(queuedCount: number) {
  useEffect(() => {
    if (queuedCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [queuedCount]);
}
