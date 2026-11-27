"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export type ExamTab =
  | "review"
  | "settings"
  | "questions"
  | "enrollments"
  | "monitor"
  | "grading"
  | "disputes"
  | "analytics"
  | "audit";

const TABS: ExamTab[] = [
  "review",
  "settings",
  "questions",
  "enrollments",
  "monitor",
  "grading",
  "disputes",
  "analytics",
  "audit",
];

/** Active exam-detail tab, seeded from `?tab=` and mirrored back into the URL. */
export function useExamTab() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ExamTab>(() => {
    const t = searchParams.get("tab");
    return TABS.includes(t as ExamTab) ? (t as ExamTab) : "review";
  });
  // Keep the tab in the URL (refresh + shareable links) without a navigation.
  const openTab = (t: ExamTab) => {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  };
  return [tab, openTab] as const;
}
