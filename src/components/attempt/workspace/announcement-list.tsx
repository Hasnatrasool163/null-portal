"use client";
import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { AnnouncementItem } from "@/shared/schemas/monitoring";

/** Dismissible examiner announcements. */
export function AnnouncementList({
  announcements,
}: {
  announcements: AnnouncementItem[];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  return announcements
    .filter((a) => !dismissed.has(a.id))
    .map((a) => (
      <div
        key={a.id}
        role="status"
        className="border-primary/40 bg-accent text-accent-foreground flex items-start justify-between gap-3 rounded-md border px-4 py-2.5 text-sm"
      >
        <div className="flex items-start gap-2">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-medium">Announcement:</span> {a.message}
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss announcement"
          className="hover:opacity-75"
          onClick={() => setDismissed((prev) => new Set(prev).add(a.id))}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ));
}
