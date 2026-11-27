"use client";
import { useEffect, useState } from "react";
import { CircleCheck, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const SAVE_STATES = [
  {
    icon: CircleCheck,
    title: "All answers saved",
    sub: "Synced to the server.",
    tone: "text-success",
  },
  {
    icon: CloudOff,
    title: "Offline · 3 answers on this device",
    sub: "The timer keeps running. Keep working.",
    tone: "text-warning",
  },
  {
    icon: RefreshCw,
    title: "Back online · syncing 3 answers",
    sub: "Nothing is lost.",
    tone: "text-primary",
  },
] as const;

/** Looping preview of the exam save-status pill (static under reduced motion). */
export function SaveStatusDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setI((x) => (x + 1) % SAVE_STATES.length),
      2800,
    );
    return () => clearInterval(id);
  }, []);
  const s = SAVE_STATES[i];
  return (
    <div className="bg-card shadow-elev-2 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3">
      <s.icon
        key={`i${i}`}
        className={cn("animate-page-in h-5 w-5 shrink-0", s.tone)}
        aria-hidden="true"
      />
      <div key={i} className="animate-page-in min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.title}</p>
        <p className="text-muted-foreground truncate text-xs">{s.sub}</p>
      </div>
      <span className="text-muted-foreground self-start font-mono text-[10px]">
        Preview
      </span>
    </div>
  );
}
