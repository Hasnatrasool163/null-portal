"use client";
import {
  CalendarClock,
  Check,
  Pencil,
  Plus,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MULTI_LABEL, type ExamDetail } from "@/shared/schemas/exam";
import type { ExamTab } from "./use-exam-tab";

type SetupStep = {
  title: string;
  done: boolean;
  detail: string;
  action?: { label: string; icon: LucideIcon; onClick: () => void };
};

function buildSteps(
  exam: ExamDetail,
  onOpenTab: (t: ExamTab) => void,
): SetupStep[] {
  // Blockers that aren't covered by a step (e.g. schedule problems) belong to the schedule step.
  const scheduleIssues = exam.readiness.blockers.filter(
    (b) => !/question|marks|candidate/i.test(b),
  );
  return [
    {
      title: "Schedule and rules",
      done: scheduleIssues.length === 0,
      detail:
        scheduleIssues[0] ??
        `${exam.durationMinutes} min, ${MULTI_LABEL[exam.multiScoring].toLowerCase()} scoring`,
      action: {
        label: scheduleIssues.length ? "Fix schedule" : "Edit",
        icon: scheduleIssues.length ? CalendarClock : Pencil,
        onClick: () => onOpenTab("settings"),
      },
    },
    {
      title: "Add questions",
      done: exam.questionCount > 0 && exam.totalMarks > 0,
      detail:
        exam.questionCount > 0
          ? `${plural(exam.questionCount, "question")} · ${exam.totalMarks} marks`
          : "Choose from your bank or draw at random by rules.",
      action: {
        label: exam.questionCount > 0 ? "Edit" : "Add questions",
        icon: exam.questionCount > 0 ? Pencil : Plus,
        onClick: () => onOpenTab("questions"),
      },
    },
    {
      title: "Enroll candidates",
      done: exam.enrollmentCount > 0,
      detail:
        exam.enrollmentCount > 0
          ? `${plural(exam.enrollmentCount, "candidate")} enrolled`
          : "Pick candidates or import a list.",
      action: {
        label: exam.enrollmentCount > 0 ? "Edit" : "Enroll",
        icon: exam.enrollmentCount > 0 ? Pencil : UserPlus,
        onClick: () => onOpenTab("enrollments"),
      },
    },
  ];
}

/** Draft setup as a short guided flow: what's done, what's next, one action per step. */
export function SetupSteps({
  exam,
  onOpenTab,
  onPublish,
}: {
  exam: ExamDetail;
  onOpenTab: (t: ExamTab) => void;
  onPublish: () => void;
}) {
  const steps = buildSteps(exam, onOpenTab);
  const doneCount = steps.filter((x) => x.done).length;
  const ready = exam.readiness.ready;
  const next = steps.findIndex((x) => !x.done);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <div>
          <h3 className="font-semibold">Set up this exam</h3>
          <p className="text-muted-foreground text-xs">
            {ready
              ? "Everything is in place. Review and publish."
              : `${doneCount} of ${steps.length} steps done`}
          </p>
        </div>
        <div
          className="bg-muted h-1.5 w-28 overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-500"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ol className="divide-y">
        {steps.map((st, i) => (
          <li key={st.title} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                st.done
                  ? "bg-primary border-primary text-primary-foreground"
                  : i === next
                    ? "border-primary text-primary"
                    : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {st.done ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {st.title}
                <span className="sr-only">
                  {st.done ? " (done)" : " (to do)"}
                </span>
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {st.detail}
              </p>
            </div>
            {st.action && (
              <Button
                size="sm"
                className="min-w-24"
                variant={i === next ? "default" : "outline"}
                onClick={st.action.onClick}
              >
                <st.action.icon className="h-3.5 w-3.5" />
                {st.action.label}
              </Button>
            )}
          </li>
        ))}
        <li className="flex items-center gap-4 px-5 py-3.5">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              ready ? "border-primary text-primary" : "text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {steps.length + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Review and publish</p>
            <p className="text-muted-foreground text-xs">
              {ready
                ? "Candidates see it once the window opens."
                : "Available once the steps above are done."}
            </p>
          </div>
          <Button
            size="sm"
            className="min-w-24"
            disabled={!ready}
            onClick={onPublish}
          >
            <Send className="h-3.5 w-3.5" />
            Publish
          </Button>
        </li>
      </ol>
    </Card>
  );
}
