"use client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";

/** Candidate's one-time escalation with a written reason. */
export function EscalateDisputeForm({
  reason,
  onReasonChange,
  pending,
  onBack,
  onSubmit,
}: {
  reason: string;
  onReasonChange: (value: string) => void;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Why do you disagree with the resolution?" htmlFor="d-esc" hint="At least 20 characters. You can only escalate once.">
        <Textarea id="d-esc" rows={4} maxLength={2000} value={reason} onChange={(e) => onReasonChange(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={pending || reason.trim().length < 20}>
          {pending && <Spinner />}
          Escalate
        </Button>
      </div>
    </form>
  );
}
