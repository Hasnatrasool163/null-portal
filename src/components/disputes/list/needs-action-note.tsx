import { AlertTriangle } from "lucide-react";

/** Warning strip counting disputes waiting on the viewer; hidden at zero. */
export function NeedsActionNote({ count, text }: { count: number; text: string }) {
  if (count === 0) return null;
  return (
    <p className="border-warning/40 bg-warning/10 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <AlertTriangle className="text-warning h-4 w-4 shrink-0" aria-hidden="true" />
      {count} {text}
    </p>
  );
}
