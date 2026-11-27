"use client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/blocks";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title="Something went wrong"
      text="Please try again."
      action={<Button onClick={reset}>Retry</Button>}
    />
  );
}
