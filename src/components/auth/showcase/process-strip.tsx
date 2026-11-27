const STEPS = ["Create", "Conduct", "Monitor", "Grade", "Verify"];

/** Numbered exam lifecycle strip for the examiner showcase. */
export function ProcessStrip() {
  return (
    <ol className="stagger grid max-w-md grid-cols-5 gap-2">
      {STEPS.map((s, i) => (
        <li key={s} className="border-primary/70 border-t-2 pt-2">
          <span className="text-muted-foreground block font-mono text-[11px]">
            0{i + 1}
          </span>
          <span className="text-sm font-medium">{s}</span>
        </li>
      ))}
    </ol>
  );
}
