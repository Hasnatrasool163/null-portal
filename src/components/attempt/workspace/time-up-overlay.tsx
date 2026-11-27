"use client";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";

/** Blocking overlay while the time-up auto-submit is in progress. */
export function TimeUpOverlay({ waitingForSync }: { waitingForSync: boolean }) {
  return (
    <div className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center p-4">
      <Card
        className="animate-page-in max-w-md space-y-3 p-6 text-center"
        role="alertdialog"
        aria-live="assertive"
      >
        <Clock className="text-primary mx-auto h-8 w-8" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Time is up</h2>
        <p className="text-muted-foreground text-sm">
          {waitingForSync
            ? "Waiting for your connection to send the last answers. Keep this page open. Answers you gave before the deadline will still be accepted."
            : "Submitting your exam…"}
        </p>
        <Spinner className="mx-auto" />
      </Card>
    </div>
  );
}
