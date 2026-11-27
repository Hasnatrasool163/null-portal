/** Sketch model and its per-attempt persistence on this device (localStorage). */

export type SketchTool = "pen" | "eraser";
export type SketchInk = "ink" | "primary" | "destructive";
export type Stroke = {
  tool: SketchTool;
  ink: SketchInk;
  width: number;
  /** Points normalised to 0..1 so the sketch survives panel resizes. */
  pts: [number, number][];
};

export const INKS: { key: SketchInk; label: string; cssVar: string }[] = [
  { key: "ink", label: "Ink", cssVar: "--foreground" },
  { key: "primary", label: "Teal", cssVar: "--primary" },
  { key: "destructive", label: "Red", cssVar: "--destructive" },
];
export const WIDTHS = [2, 5];

const sketchKey = (attemptId: string) => `np.sketch.${attemptId}`;

export function clearLocalSketch(attemptId: string) {
  try {
    localStorage.removeItem(sketchKey(attemptId));
  } catch {
    /* ignore */
  }
}

export function loadStrokes(attemptId: string): Stroke[] {
  try {
    const raw = localStorage.getItem(sketchKey(attemptId));
    return raw ? (JSON.parse(raw) as Stroke[]) : [];
  } catch {
    return [];
  }
}

export function saveStrokes(attemptId: string, strokes: Stroke[]) {
  try {
    localStorage.setItem(sketchKey(attemptId), JSON.stringify(strokes));
  } catch {
    /* storage full or blocked: sketch stays in memory */
  }
}

/** Paints one stroke onto a canvas of CSS size w x h. */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  s: Stroke,
  w: number,
  h: number,
) {
  if (s.pts.length === 0) return;
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue(INKS.find((i) => i.key === s.ink)!.cssVar)
    .trim();
  ctx.globalCompositeOperation =
    s.tool === "eraser" ? "destination-out" : "source-over";
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
}
