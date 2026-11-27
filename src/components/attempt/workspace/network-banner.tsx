"use client";
import { WifiOff } from "lucide-react";
import type { NetworkState } from "@/hooks/use-network-status";

/** Offline / unstable-connection alert; renders nothing while online. */
export function NetworkBanner({
  state,
  latencyMs,
}: {
  state: NetworkState;
  latencyMs: number | null;
}) {
  if (state === "online") return null;
  return (
    <div
      role="alert"
      className={`animate-page-in flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
        state === "offline"
          ? "border-destructive bg-destructive/15 text-destructive"
          : "border-warning bg-warning/15 text-warning"
      }`}
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      {state === "offline"
        ? "Connection lost. Your timer continues on the server; keep working and reconnect before the recovery window closes."
        : `Unstable connection (${latencyMs ?? "?"} ms). Saves may take longer than usual.`}
    </div>
  );
}
