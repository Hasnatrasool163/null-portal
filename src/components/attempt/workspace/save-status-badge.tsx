"use client";
import { Badge } from "@/components/ui/misc";
import type { NetworkState } from "@/hooks/use-network-status";
import type { SaveChip } from "./use-answer-sync";

/** Live save/sync state of the offline answer queue. */
export function SaveStatusBadge({
  netState,
  saveChip,
  queuedCount,
}: {
  netState: NetworkState;
  saveChip: SaveChip;
  queuedCount: number;
}) {
  return (
    <Badge
      role="status"
      aria-live="polite"
      className={
        netState === "offline" || saveChip === "error"
          ? "bg-destructive/15 text-destructive"
          : queuedCount > 0
            ? "bg-warning/15 text-warning"
            : saveChip === "saved"
              ? "bg-success/15 text-success"
              : "bg-muted text-muted-foreground"
      }
    >
      {netState === "offline"
        ? queuedCount > 0
          ? `Offline · Queued ${queuedCount}`
          : "Offline"
        : queuedCount > 0
          ? saveChip === "saving"
            ? `Syncing ${queuedCount}...`
            : `Queued ${queuedCount}`
          : saveChip === "saving"
            ? "Saving..."
            : "Saved"}
    </Badge>
  );
}
