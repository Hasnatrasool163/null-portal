"use client";

export type GradingMode = "candidate" | "question";

const MODES = [
  ["candidate", "By candidate"],
  ["question", "By question (blind)"],
] as const;

/** Switch between per-candidate grading and blind grade-by-question. */
export function GradingModeToggle({
  mode,
  onChange,
}: {
  mode: GradingMode;
  onChange: (mode: GradingMode) => void;
}) {
  return (
    <div role="tablist" aria-label="Grading view" className="bg-muted inline-flex rounded-lg p-1 text-sm">
      {MODES.map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={mode === id}
          onClick={() => onChange(id)}
          className={`rounded-md px-3 py-1.5 font-medium ${
            mode === id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
