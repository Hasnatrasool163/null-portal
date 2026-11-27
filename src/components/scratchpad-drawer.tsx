"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        title="Digital scratchpad"
        description="Private rough work visible only to you. Retained with your attempt but never graded."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={mode === "notes" ? "default" : "outline"}
                onClick={() => setMode("notes")}
              >
                Notes
              </Button>
              <Button
                size="sm"
                variant={mode === "draw" ? "default" : "outline"}
                onClick={() => setMode("draw")}
              >
                <PenTool className="h-3.5 w-3.5" />
                Sketch pad
              </Button>
            </div>
            {mode === "notes" ? (
              <span className="text-muted-foreground text-xs">
                {status === "saved"
                  ? "Autosaved"
                  : status === "saving"
                    ? "Saving..."
                    : "Unsaved..."}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const ctx = canvasRef.current?.getContext("2d");
                  if (ctx && canvasRef.current) {
                    ctx.clearRect(
                      0,
                      0,
                      canvasRef.current.width,
                      canvasRef.current.height,
                    );
                  }
                }}
              >
                <Eraser className="h-3.5 w-3.5" />
                Clear sketch
              </Button>
            )}
          </div>

          {mode === "notes" ? (
            <textarea
              rows={10}
              maxLength={20_000}
              aria-label="Scratchpad notes"
              placeholder="Write formulas, outlines, or rough calculations here..."
              className="border-input bg-background focus-visible:ring-ring w-full rounded-md border p-3 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={520}
              height={260}
              className="bg-background w-full touch-none rounded-md border"
              onPointerDown={(e) => {
                drawingRef.current = true;
                const ctx = e.currentTarget.getContext("2d");
                if (!ctx) return;
                const { x, y } = pointerPos(e);
                ctx.strokeStyle = "#1d5c63";
                ctx.lineWidth = 2;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(x, y);
              }}
              onPointerMove={(e) => {
                if (!drawingRef.current) return;
                const ctx = e.currentTarget.getContext("2d");
                if (!ctx) return;
                const { x, y } = pointerPos(e);
                ctx.lineTo(x, y);
                ctx.stroke();
              }}
              onPointerUp={() => {
                drawingRef.current = false;
              }}
              onPointerLeave={() => {
                drawingRef.current = false;
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
