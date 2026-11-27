import { cn } from "@/lib/utils";

/**
 * Decorative backdrop from the exam's own question-palette motif.
 * A single SVG pattern (not hundreds of DOM nodes) so it costs nothing to render.
 */
export function PaletteBackdrop({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn(
        "text-foreground pointer-events-none absolute inset-0 h-full w-full opacity-[0.07] [mask-image:linear-gradient(120deg,transparent_30%,black_95%)]",
        className,
      )}
    >
      <defs>
        {/* open cells */}
        <pattern id="np-cells" width="36" height="36" patternUnits="userSpaceOnUse">
          <rect x="5" y="5" width="26" height="26" rx="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
        {/* "answered" cells, sparse and offset so the grid reads like a real palette */}
        <pattern id="np-answered" width="180" height="108" patternUnits="userSpaceOnUse">
          <rect x="5" y="5" width="26" height="26" rx="5" fill="currentColor" />
          <rect x="113" y="41" width="26" height="26" rx="5" fill="currentColor" />
          <rect x="77" y="77" width="26" height="26" rx="5" fill="currentColor" />
          <rect x="149" y="5" width="26" height="26" rx="5" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#np-cells)" />
      <rect width="100%" height="100%" fill="url(#np-answered)" />
    </svg>
  );
}
