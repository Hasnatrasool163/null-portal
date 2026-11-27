"use client";
import { useState } from "react";
import { Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/misc";
import {
  DISPUTE_OUTCOMES,
  OUTCOME_LABEL,
  type DisputeDetail,
  type DisputeOutcome,
} from "@/shared/schemas/dispute";

/** Examiner resolution / admin final decision, with an optional written-mark correction. */
export function DisputeDecisionForm({
  d,
  action,
  pending,
  onSubmit,
}: {
  d: DisputeDetail;
  action: "RESOLVE" | "DECIDE";
  pending: boolean;
  onSubmit: (v: { outcome: DisputeOutcome; rationale: string; newScore?: number }) => void;
}) {
  const [outcome, setOutcome] = useState<DisputeOutcome>("REJECTED");
  const [rationale, setRationale] = useState("");
  const written = d.question?.type === "WRITTEN";
  const [mark, setMark] = useState(written && d.question?.score !== null ? String(d.question?.score) : "");
  const markNum = mark.trim() === "" ? undefined : Number(mark);
  const markChanged = written && markNum !== undefined && markNum !== d.question?.score;
  const objective = d.question && !written;

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ outcome, rationale, newScore: markChanged && outcome !== "REJECTED" ? markNum : undefined });
      }}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Gavel className="h-4 w-4" aria-hidden="true" />
        {action === "DECIDE" ? "Final decision (cannot be appealed)" : "Resolve this dispute"}
      </p>
      <Field label="Outcome" htmlFor="d-outcome">
        <Select id="d-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as DisputeOutcome)}>
          {DISPUTE_OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {OUTCOME_LABEL[o]}
            </option>
          ))}
        </Select>
      </Field>
      {written && outcome !== "REJECTED" && (
        <Field
          label={`Corrected mark for Q${d.question!.position + 1} (out of ${d.question!.marks})`}
          htmlFor="d-mark"
          hint="Leave unchanged if no mark change is needed. The change is audited and linked to this dispute."
        >
          <Input
            id="d-mark"
            type="number"
            step={0.5}
            min={0}
            max={d.question!.marks}
            value={mark}
            onChange={(e) => setMark(e.target.value)}
          />
        </Field>
      )}
      {objective && outcome !== "REJECTED" && (
        <p className="border-warning/40 bg-warning/10 rounded-md border px-3 py-2 text-xs leading-relaxed">
          To change marks on an objective question, use <b>Answer-key rescore</b> on the exam first. It
          corrects the key for every candidate, not just this one, so the result stays fair. Then resolve
          here; the new score is recorded automatically.
        </p>
      )}
      <Field label="Written rationale" htmlFor="d-rationale" hint="Shown to the candidate. At least 20 characters.">
        <Textarea id="d-rationale" rows={4} maxLength={2000} value={rationale} onChange={(e) => setRationale(e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || rationale.trim().length < 20}>
          {pending && <Spinner />}
          {action === "DECIDE" ? "Record final decision" : "Resolve"}
        </Button>
      </div>
    </form>
  );
}
