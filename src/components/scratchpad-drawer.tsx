"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Eraser,
  NotebookPen,
  PenTool,
  Redo2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

type Tool = "pen" | "eraser";
type Ink = "ink" | "primary" | "destructive";
type Stroke = {
  tool: Tool;
  ink: Ink;
  width: number;
  /** Points normalised to 0..1 so the sketch survives panel resizes. */
  pts: [number, number][];
};

const INKS: { key: Ink; label: string; cssVar: string }[] = [
  { key: "ink", label: "Ink", cssVar: "--foreground" },
  { key: "primary", label: "Teal", cssVar: "--primary" },
  { key: "destructive", label: "Red", cssVar: "--destructive" },
];
const WIDTHS = [2, 5];
const sketchKey = (attemptId: string) => `np.sketch.${attemptId}`;

export function clearLocalSketch(attemptId: string) {
  try {
    localStorage.removeItem(sketchKey(attemptId));
  } catch {
    /* ignore */
  }
}

function loadStrokes(attemptId: string): Stroke[] {
  try {
    const raw = localStorage.getItem(sketchKey(attemptId));
    return raw ? (JSON.parse(raw) as Stroke[]) : [];
  } catch {
    return [];
  }
}

function SketchPad({ attemptId, visible }: { attemptId: string; visible: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoRef = useRef<Stroke[]>([]);
  const liveRef = useRef<Stroke | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [ink, setInk] = useState<Ink>("ink");
  const [width, setWidth] = useState(WIDTHS[0]);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });
  const [confirmClear, setConfirmClear] = useState(false);

  const sync = () =>
    setCounts({ undo: strokesRef.current.length, redo: redoRef.current.length });

  const persist = useCallback(() => {
    try {
      localStorage.setItem(sketchKey(attemptId), JSON.stringify(strokesRef.current));
    } catch {
      /* storage full or blocked: sketch stays in memory */
    }
  }, [attemptId]);

  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) => {
    if (s.pts.length === 0) return;
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(INKS.find((i) => i.key === s.ink)!.cssVar)
      .trim();
    ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color || "#000";
    ctx.lineWidth = s.tool === "eraser" ? s.width * 4 : s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const [x0, y0] = s.pts[0];
    ctx.moveTo(x0 * w, y0 * h);
    if (s.pts.length === 1) ctx.lineTo(x0 * w + 0.01, y0 * h);
    for (const [x, y] of s.pts.slice(1)) ctx.lineTo(x * w, y * h);
    ctx.stroke();
  };

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.width / dpr;
    const h = c.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of strokesRef.current) drawStroke(ctx, s, w, h);
    if (liveRef.current) drawStroke(ctx, liveRef.current, w, h);
  }, []);

  // Size the canvas to its box at device-pixel resolution (sharp lines on retina).
  useEffect(() => {
    strokesRef.current = loadStrokes(attemptId);
    sync();
    const wrap = wrapRef.current;
    const c = canvasRef.current;
    if (!wrap || !c) return;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      if (r.width === 0) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      redraw();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [attemptId, redraw]);

  useEffect(() => {
    if (visible) redraw();
  }, [visible, redraw]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  function undo() {
    const s = strokesRef.current.pop();
    if (s) redoRef.current.push(s);
    redraw();
    persist();
    sync();
  }
  function redo() {
    const s = redoRef.current.pop();
    if (s) strokesRef.current.push(s);
    redraw();
    persist();
    sync();
  }
  function clearAll() {
    strokesRef.current = [];
    redoRef.current = [];
    redraw();
    persist();
    sync();
    setConfirmClear(false);
  }

  const chip =
    "flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-[background-color,color,transform] motion-safe:active:scale-90 disabled:opacity-40 disabled:pointer-events-none";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Sketch tools">
        <button type="button" aria-pressed={tool === "pen"} onClick={() => setTool("pen")}
          className={cn(chip, tool === "pen" ? "bg-foreground text-background" : "hover:bg-accent")}>
          <PenTool className="h-3.5 w-3.5" /> Pen
        </button>
        <button type="button" aria-pressed={tool === "eraser"} onClick={() => setTool("eraser")}
          className={cn(chip, tool === "eraser" ? "bg-foreground text-background" : "hover:bg-accent")}>
          <Eraser className="h-3.5 w-3.5" /> Eraser
        </button>
        <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
        {INKS.map((i) => (
          <button key={i.key} type="button" aria-label={`${i.label} ink`} aria-pressed={ink === i.key}
            onClick={() => { setInk(i.key); setTool("pen"); }}
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-transform motion-safe:active:scale-90",
              ink === i.key && tool === "pen" ? "ring-foreground ring-2" : "hover:bg-accent")}>
            <span className="h-4 w-4 rounded-full" style={{ background: `var(${i.cssVar})` }} />
          </button>
        ))}
        {WIDTHS.map((w) => (
          <button key={w} type="button" aria-label={w === WIDTHS[0] ? "Thin line" : "Thick line"} aria-pressed={width === w}
            onClick={() => setWidth(w)}
            className={cn("flex h-8 w-8 items-center justify-center rounded-lg", width === w ? "bg-accent" : "hover:bg-accent")}>
            <span className="bg-foreground rounded-full" style={{ width: w + 3, height: w + 3 }} />
          </button>
        ))}
        <span className="bg-border mx-1 h-5 w-px" aria-hidden="true" />
        <button type="button" aria-label="Undo (Ctrl+Z)" disabled={counts.undo === 0} onClick={undo} className={cn(chip, "hover:bg-accent w-8")}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Redo (Ctrl+Shift+Z)" disabled={counts.redo === 0} onClick={redo} className={cn(chip, "hover:bg-accent w-8")}>
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={counts.undo === 0}
          onClick={() => (confirmClear ? clearAll() : setConfirmClear(true))}
          onBlur={() => setConfirmClear(false)}
          className={cn(chip, "ml-auto", confirmClear ? "bg-destructive text-white" : "text-destructive hover:bg-destructive/10")}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmClear ? "Confirm clear" : "Clear"}
        </button>
      </div>
      <div ref={wrapRef} className="bg-background relative min-h-56 flex-1 overflow-hidden rounded-lg border [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px]">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label="Sketch pad. Draw with mouse, touch or stylus."
          className={cn("absolute inset-0 h-full w-full touch-none focus-visible:outline-none", tool === "eraser" ? "cursor-cell" : "cursor-crosshair")}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            liveRef.current = { tool, ink, width, pts: [point(e)] };
            redraw();
          }}
          onPointerMove={(e) => {
            if (!liveRef.current) return;
            const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
            const r = e.currentTarget.getBoundingClientRect();
            for (const ev of events)
              liveRef.current.pts.push([(ev.clientX - r.left) / r.width, (ev.clientY - r.top) / r.height]);
            redraw();
          }}
          onPointerUp={() => {
            if (!liveRef.current) return;
            strokesRef.current.push(liveRef.current);
            liveRef.current = null;
            redoRef.current = [];
            persist();
            sync();
          }}
          onPointerCancel={() => {
            liveRef.current = null;
            redraw();
          }}
        />
      </div>
    </div>
  );
}

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
  const [text, setText] = useState(initialText);
  const [status, setStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [mode, setMode] = useState<"notes" | "draw">("notes");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("textarea, canvas")?.focus();
  }, [open, mode]);

  function onTextChange(val: string) {
    setText(val);
    setStatus("unsaved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await api(`/api/attempts/${attemptId}/scratchpad`, {
          method: "PUT",
          body: { scratchpad: val },
        });
        setStatus("saved");
      } catch {
        setStatus("unsaved");
      }
    }, 600);
  }

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
