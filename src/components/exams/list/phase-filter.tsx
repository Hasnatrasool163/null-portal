"use client";
import { Button } from "@/components/ui/button";
import { PHASES, PHASE_LABEL, type Phase } from "@/shared/schemas/exam";

/** Toggle-button group filtering the exam list by phase ("" = all). */
export function PhaseFilter({
  value,
  onChange,
}: {
  value: Phase | "";
  onChange: (phase: Phase | "") => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Filter by phase"
    >
      <Button
        size="sm"
        variant="outline"
        aria-pressed={value === ""}
        onClick={() => onChange("")}
      >
        All
      </Button>
      {PHASES.map((p) => (
        <Button
          key={p}
          size="sm"
          variant="outline"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
        >
          {PHASE_LABEL[p]}
        </Button>
      ))}
    </div>
  );
}
