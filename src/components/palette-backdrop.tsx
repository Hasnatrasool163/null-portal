import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

// Deterministic "question palette" cells: answered (filled), flagged, open, a few pulsing.
const CELLS = Array.from({ length: 260 }, (_, i) => {
  const n = (i * 37 + 11) % 17;
  return {
    filled: n < 5,
    flag: n === 9 && i % 2 === 0,
    pulse: n === 3 && i % 3 === 0,
    delay: (i % 7) * 0.6,
  };
});

/** Decorative backdrop built from the exam's own question-palette motif. */
export function PaletteBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 grid auto-rows-[26px] grid-cols-[repeat(auto-fill,26px)] content-center justify-center gap-3 overflow-hidden p-3 opacity-[0.16] [mask-image:linear-gradient(115deg,transparent_35%,black_92%)]",
        className,
      )}
    >
      {CELLS.map((c, i) => (
        <div
          key={i}
          className={cn(
            "border-foreground flex items-center justify-center rounded-[7px] border-[1.5px]",
            c.filled && "bg-foreground",
            c.pulse && "bg-primary border-primary animate-cell",
          )}
          style={c.pulse ? { animationDelay: `${c.delay}s` } : undefined}
        >
          {c.flag && <Flag className="h-3 w-3" strokeWidth={2.5} />}
        </div>
      ))}
    </div>
  );
}
