"use client";

/** One question tile, shared by the side panel, the palette dialog and the bottom bar. */
export function PaletteTile({
  index,
  answered,
  flagged,
  active,
  onSelect,
  className = "",
}: {
  index: number;
  answered: boolean;
  flagged: boolean;
  active: boolean;
  onSelect: () => void;
  className?: string;
}) {
  const tone = active
    ? "bg-primary text-primary-foreground shadow-elev-1 ring-2 ring-primary/30 ring-offset-1 ring-offset-card"
    : answered
      ? "border border-primary/50 bg-primary/10 text-primary font-semibold hover:bg-primary/15"
      : "border border-dashed border-foreground/25 bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground";
  const base = `relative flex h-9 items-center justify-center rounded-md text-[13px] font-medium tabular-nums transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-95 ${tone}`;

  return (
    <button
      type="button"
      aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}${flagged ? ", flagged" : ""}`}
      aria-current={active ? "step" : undefined}
      onClick={onSelect}
      className={className ? `${base} ${className}` : base}
    >
      {index + 1}
      {flagged && (
        <span
          aria-hidden="true"
          className="bg-warning ring-card absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2"
        />
      )}
    </button>
  );
}
