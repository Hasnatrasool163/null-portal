"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Inline comment box; the draft is owned by the dialog so it clears after any action. */
export function DisputeCommentForm({
  value,
  onChange,
  pending,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Input
        aria-label="Add a comment"
        placeholder="Add a comment visible to everyone on this dispute"
        value={value}
        maxLength={2000}
        onChange={(e) => onChange(e.target.value)}
      />
      <Button type="submit" variant="outline" disabled={pending || value.trim().length < 2}>
        Send
      </Button>
    </form>
  );
}
