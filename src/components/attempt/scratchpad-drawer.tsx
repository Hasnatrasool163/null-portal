"use client";
import { useEffect, useRef, useState } from "react";
import { NotebookPen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SketchPad } from "./workspace/sketch-pad";
import { useScratchpadAutosave } from "./workspace/use-scratchpad-autosave";

export { clearLocalSketch } from "./workspace/sketch-storage";

/**
 * Docked scratchpad: sits beside the question on desktop (never covers it),
 * bottom sheet on mobile. Notes autosave to the attempt on the server; the
 * sketch is kept on this device per attempt. Neither is graded.
 */
export function ScratchpadDrawer({
  attemptId,
  initialText,
  open,
  onOpenChange,
}: {
  attemptId: string;
  initialText: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { text, status, onTextChange } = useScratchpadAutosave(attemptId, initialText);
  const [mode, setMode] = useState<"notes" | "draw">("notes");
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("textarea, canvas")?.focus();
  }, [open, mode]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <aside
      ref={panelRef}
      aria-label="Scratchpad"
      aria-hidden={!open}
      inert={!open}
      onKeyDown={(e) => {
        if (e.key === "Escape") onOpenChange(false);
      }}
      className={cn(
        "bg-card shadow-elev-3 fixed z-40 flex flex-col gap-3 border p-4 transition-[transform,opacity] duration-300 ease-out",
        "inset-x-0 bottom-0 h-[62vh] rounded-t-lg",
        "lg:inset-x-auto lg:top-4 lg:right-4 lg:bottom-4 lg:h-auto lg:w-[400px] lg:rounded-lg",
        open
          ? "translate-y-0 opacity-100 lg:translate-x-0"
          : "pointer-events-none translate-y-full opacity-0 lg:translate-x-[110%] lg:translate-y-0",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <NotebookPen className="text-primary h-4 w-4" aria-hidden="true" />
            Scratchpad
          </h2>
          <p className="text-muted-foreground text-xs">
            Rough work. Not graded. Only you can see it.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close scratchpad"
          onClick={() => onOpenChange(false)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1.5 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="bg-muted/60 grid grid-cols-2 gap-1 rounded-lg border p-1" role="tablist">
          {(["notes", "draw"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition-colors",
                mode === m ? "bg-foreground text-background shadow-elev-1" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "notes" ? "Notes" : "Sketch"}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs" role="status" aria-live="polite">
          {mode === "notes"
            ? status === "saved"
              ? `Saved · ${words} word${words === 1 ? "" : "s"}`
              : status === "saving"
                ? "Saving…"
                : "Not saved yet"
            : "Kept on this device"}
        </span>
      </div>

      <textarea
        hidden={mode !== "notes"}
        maxLength={20_000}
        aria-label="Scratchpad notes"
        placeholder="Formulas, outlines, rough calculations…"
        className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 min-h-0 w-full flex-1 resize-none rounded-lg border p-3 font-mono text-sm leading-relaxed focus-visible:ring-4 focus-visible:outline-none"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
      {/* Kept mounted so switching tabs never wipes the drawing. */}
      <div hidden={mode !== "draw"} className="flex min-h-0 flex-1 flex-col">
        <SketchPad attemptId={attemptId} visible={open && mode === "draw"} />
      </div>
    </aside>
  );
}
