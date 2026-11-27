"use client";
import { useState } from "react";
import { Eraser, PenTool, Redo2, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { INKS, WIDTHS, type SketchInk, type SketchTool } from "./sketch-storage";

const chip =
  "flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-[background-color,color,transform] motion-safe:active:scale-90 disabled:opacity-40 disabled:pointer-events-none";

/** Pen/eraser, ink, width, undo/redo and two-step clear for the sketch pad. */
export function SketchToolbar({
  tool,
  onToolChange,
  ink,
  onInkChange,
  width,
  onWidthChange,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  onClear,
}: {
  tool: SketchTool;
  onToolChange: (tool: SketchTool) => void;
  ink: SketchInk;
  onInkChange: (ink: SketchInk) => void;
  width: number;
  onWidthChange: (width: number) => void;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Sketch tools">
      <button type="button" aria-pressed={tool === "pen"} onClick={() => onToolChange("pen")}
        className={cn(chip, tool === "pen" ? "bg-foreground text-background" : "hover:bg-accent")}>
        <PenTool className="h-3.5 w-3.5" /> Pen
      </button>
      <button type="button" aria-pressed={tool === "eraser"} onClick={() => onToolChange("eraser")}
        className={cn(chip, tool === "eraser" ? "bg-foreground text-background" : "hover:bg-accent")}>
        <Eraser className="h-3.5 w-3.5" /> Eraser
      </button>
      <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      {INKS.map((i) => (
        <button key={i.key} type="button" aria-label={`${i.label} ink`} aria-pressed={ink === i.key}
          onClick={() => { onInkChange(i.key); onToolChange("pen"); }}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-transform motion-safe:active:scale-90",
            ink === i.key && tool === "pen" ? "ring-foreground ring-2" : "hover:bg-accent")}>
          <span className="h-4 w-4 rounded-full" style={{ background: `var(${i.cssVar})` }} />
        </button>
      ))}
      {WIDTHS.map((w) => (
        <button key={w} type="button" aria-label={w === WIDTHS[0] ? "Thin line" : "Thick line"} aria-pressed={width === w}
          onClick={() => onWidthChange(w)}
          className={cn("flex h-8 w-8 items-center justify-center rounded-lg", width === w ? "bg-accent" : "hover:bg-accent")}>
          <span className="bg-foreground rounded-full" style={{ width: w + 3, height: w + 3 }} />
        </button>
      ))}
      <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
      <button type="button" aria-label="Undo (Ctrl+Z)" disabled={undoCount === 0} onClick={onUndo} className={cn(chip, "hover:bg-accent w-8")}>
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Redo (Ctrl+Shift+Z)" disabled={redoCount === 0} onClick={onRedo} className={cn(chip, "hover:bg-accent w-8")}>
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={undoCount === 0}
        onClick={() => {
          if (confirmClear) {
            onClear();
            setConfirmClear(false);
          } else setConfirmClear(true);
        }}
        onBlur={() => setConfirmClear(false)}
        className={cn(chip, "ml-auto", confirmClear ? "bg-destructive text-white" : "text-destructive hover:bg-destructive/10")}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {confirmClear ? "Confirm clear" : "Clear"}
      </button>
    </div>
  );
}
