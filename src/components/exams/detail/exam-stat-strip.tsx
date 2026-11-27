"use client";
import { Award, ListChecks, Timer, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ExamDetail } from "@/shared/schemas/exam";
import type { ExamTab } from "./use-exam-tab";

/** Headline numbers; each tile jumps to the tab where that value is edited. */
export function ExamStatStrip({
  exam,
  onOpenTab,
}: {
  exam: ExamDetail;
  onOpenTab: (t: ExamTab) => void;
}) {
  const stats = [
    {
      label: "Questions",
      value: exam.questionCount,
      tab: "questions" as ExamTab,
      icon: ListChecks,
    },
    {
      label: "Total marks",
      value: exam.totalMarks,
      tab: "questions" as ExamTab,
      icon: Award,
    },
    {
      label: "Candidates",
      value: exam.enrollmentCount,
      tab: "enrollments" as ExamTab,
      icon: Users,
    },
    {
      label: "Duration",
      value: `${exam.durationMinutes} min`,
      tab: "settings" as ExamTab,
      icon: Timer,
    },
  ];
  return (
    <Card className="grid grid-cols-2 divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {stats.map((st) => (
        <button
          key={st.label}
          type="button"
          onClick={() => onOpenTab(st.tab)}
          className="group hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3.5 px-5 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        >
          <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
            <st.icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="text-muted-foreground block text-xs">
              {st.label}
            </span>
            <span className="mt-0.5 block text-2xl leading-tight font-semibold tracking-tight tabular-nums">
              {st.value}
            </span>
          </span>
        </button>
      ))}
    </Card>
  );
}
