"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/misc";
import { useRefreshDisputes } from "@/components/disputes/use-refresh-disputes";
import { ApiClientError, attemptsApi } from "@/lib/api";
import { formatShortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CATEGORY_HINT,
  CATEGORY_LABEL,
  DISPUTE_CATEGORIES,
  type DisputeCategory,
} from "@/shared/schemas/dispute";

/** Candidate form for raising a dispute on a published result. */
export function FileDisputeDialog({
  open,
  onOpenChange,
  attemptId,
  questions,
  initialQuestionId,
  fileBy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  attemptId: string;
  questions: { attemptQuestionId: string; position: number }[];
  initialQuestionId?: string;
  fileBy: string | null;
}) {
  const refresh = useRefreshDisputes();
  const [questionId, setQuestionId] = useState(initialQuestionId ?? "");
  const [category, setCategory] = useState<DisputeCategory>("GRADING_ERROR");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const file = useMutation({
    mutationFn: () =>
      attemptsApi.fileDispute(attemptId, {
        attemptQuestionId: questionId || undefined,
        category,
        reason,
      }),
    onSuccess: () => {
      toast.success("Dispute filed. The examiner has been notified.");
      setReason("");
      onOpenChange(false);
      refresh();
    },
    onError: (e) => {
      if (e instanceof ApiClientError && e.fields) setErrors(e.fields);
      else toast.error(e.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Raise a dispute"
        description={`Explain what you think is wrong. The examiner must reply with a written decision, and you can escalate it to an administrator if you disagree.${fileBy ? ` Open until ${formatShortDateTime(fileBy)}.` : ""}`}
        className="max-w-lg overflow-y-auto"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErrors({});
            file.mutate();
          }}
        >
          <Field label="What is it about?" htmlFor="d-question">
            <Select id="d-question" value={questionId} onChange={(e) => setQuestionId(e.target.value)}>
              <option value="">The overall result</option>
              {questions.map((q) => (
                <option key={q.attemptQuestionId} value={q.attemptQuestionId}>
                  Question {q.position + 1}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-sm font-medium">Reason</legend>
            {DISPUTE_CATEGORIES.map((c) => (
              <label
                key={c}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors",
                  category === c ? "border-primary bg-primary/5" : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="accent-primary mt-0.5"
                />
                <span>
                  <span className="block font-medium">{CATEGORY_LABEL[c]}</span>
                  <span className="text-muted-foreground block text-xs">{CATEGORY_HINT[c]}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <Field
            label="Explanation"
            htmlFor="d-reason"
            error={errors.reason}
            hint="At least 20 characters. Be specific: what you answered, and why it deserves a different mark."
          >
            <Textarea
              id="d-reason"
              rows={5}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!errors.reason}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={file.isPending || reason.trim().length < 20}>
              {file.isPending && <Spinner />}
              File dispute
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
