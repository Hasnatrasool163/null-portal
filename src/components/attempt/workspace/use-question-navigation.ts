"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspacePreferences } from "@/shared/schemas/secondary";

/**
 * Which question is current, whether the review screen is showing, and the
 * focus/scroll behaviour that follows navigation in both layouts.
 */
export function useQuestionNavigation({
  questionCount,
  layout,
}: {
  questionCount: number;
  layout: WorkspacePreferences["layout"];
}) {
  const [index, setIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to question heading when switching questions for screen-reader/keyboard clarity.
  useEffect(() => {
    if (!reviewMode) headingRef.current?.focus();
  }, [index, reviewMode]);

  // Move to a question: page in single mode, smooth-scroll in scrolling mode.
  const jumpTo = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(questionCount - 1, i));
      setIndex(n);
      if (layout === "scroll")
        document
          .getElementById(`q-${n}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [questionCount, layout],
  );

  // Scrolling mode: highlight the question currently in view.
  useEffect(() => {
    if (layout !== "scroll" || reviewMode) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries)
          if (en.isIntersecting)
            setIndex(Number((en.target as HTMLElement).dataset.qindex));
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    document.querySelectorAll("[data-qindex]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [layout, reviewMode, questionCount]);

  /** Leave the review screen (if open) and go to question `i` once it has rendered. */
  const openQuestion = useCallback(
    (i: number) => {
      setReviewMode(false);
      requestAnimationFrame(() => jumpTo(i));
    },
    [jumpTo],
  );

  return {
    index,
    setIndex,
    reviewMode,
    setReviewMode,
    headingRef,
    jumpTo,
    openQuestion,
  };
}
