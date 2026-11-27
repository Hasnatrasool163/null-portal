"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  WIDTHS,
  drawStroke,
  loadStrokes,
  saveStrokes,
  type SketchInk,
  type SketchTool,
  type Stroke,
} from "./sketch-storage";
import { SketchToolbar } from "./sketch-toolbar";

/**
 * Freehand canvas with undo/redo. Strokes live in refs (not state) so
 * drawing never re-renders; `counts` mirrors them for the toolbar.
 */
export function SketchPad({ attemptId, visible }: { attemptId: string; visible: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const redoRef = useRef<Stroke[]>([]);
  const liveRef = useRef<Stroke | null>(null);
  const [tool, setTool] = useState<SketchTool>("pen");
  const [ink, setInk] = useState<SketchInk>("ink");
  const [width, setWidth] = useState(WIDTHS[0]);
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  const sync = () =>
    setCounts({ undo: strokesRef.current.length, redo: redoRef.current.length });

  const persist = useCallback(() => {
    saveStrokes(attemptId, strokesRef.current);
  }, [attemptId]);

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
  }

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
      <SketchToolbar
        tool={tool}
        onToolChange={setTool}
        ink={ink}
        onInkChange={setInk}
        width={width}
        onWidthChange={setWidth}
        undoCount={counts.undo}
        redoCount={counts.redo}
        onUndo={undo}
        onRedo={redo}
        onClear={clearAll}
      />
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
