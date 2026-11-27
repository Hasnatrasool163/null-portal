"use client";
import { useEffect } from "react";

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return (
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

/**
 * Grade-by-question keyboard shortcuts: ←/→ or k/j to move, n for next
 * ungraded, g to focus the marks input. Ignored while typing in a field.
 */
export function useGradingShortcuts({
  idx,
  readOnly,
  go,
  nextUngraded,
  setIdx,
}: {
  idx: number;
  readOnly: boolean;
  go: (to: number) => void;
  nextUngraded: (from: number) => number;
  setIdx: (idx: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "j") {
        e.preventDefault();
        go(idx + 1);
      } else if (e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        go(idx - 1);
      } else if (e.key === "n") {
        e.preventDefault();
        const j = nextUngraded(idx);
        if (j >= 0) setIdx(j);
      } else if (e.key === "g" && !readOnly) {
        e.preventDefault();
        document.getElementById("bq-score")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, idx, nextUngraded, readOnly, setIdx]);
}
