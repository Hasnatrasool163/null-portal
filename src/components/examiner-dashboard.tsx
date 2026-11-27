import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FilePen,
  PenLine,
  Radio,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { SchedulePanel } from "@/components/schedule-panel";
import { SubmissionsChart } from "@/components/submissions-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/blocks";
import { cn } from "@/lib/utils";
import type {
  ActionKind,
  ExaminerOverview,
  Phase,
} from "@/shared/schemas/exam";

const ACTION_ICON: Record<ActionKind, { icon: LucideIcon; tone: string }> = {
  grade: { icon: PenLine, tone: "text-warning" },
  publish: { icon: Send, tone: "text-success" },
  enroll: { icon: UserPlus, tone: "text-warning" },
  draft: { icon: FilePen, tone: "text-muted-foreground" },
};

const STATS: {
  phase: Phase;
  label: string;
  icon: LucideIcon;
  tone: string;
  accent: string;
}[] = [
  {
    phase: "ONGOING",
    label: "Live now",
    icon: Radio,
    tone: "bg-success/12 text-success",
    accent: "bg-success",
  },
  {
    phase: "UPCOMING",
    label: "Upcoming",
    icon: CalendarClock,
    tone: "bg-warning/12 text-warning",
    accent: "bg-warning",
  },
  {
    phase: "DRAFT",
    label: "Drafts",
    icon: FilePen,
    tone: "bg-accent text-accent-foreground",
    accent: "bg-primary",
  },
  {
    phase: "COMPLETED",
    label: "Completed",
    icon: CheckCircle2,
    tone: "bg-muted text-muted-foreground",
    accent: "bg-muted-foreground/40",
  },
];

const MAX_ACTIONS = 6;

export function ExaminerDashboard({
  firstName,
  phases,
  overview,
}: {
  firstName: string;
  phases: Record<Phase, number>;
  overview: ExaminerOverview;
}) {
  const { actions, live, upcoming } = overview;
  const sitting = live.reduce((n, e) => n + e.active, 0);
  const draftsNeedingSetup = actions.filter(
    (x) => x.kind === "draft" && x.cta === "Continue",
  ).length;
  const toPublish = actions.filter((x) => x.kind === "publish").length;
  const toGrade = actions.filter((x) => x.kind === "grade").length;
  const context: Record<Phase, string> = {
    ONGOING: phases.ONGOING
      ? `${sitting} candidate${sitting === 1 ? "" : "s"} sitting now`
      : "Nothing running",
    UPCOMING: upcoming[0]
      ? `Next opens in ${formatDistanceToNowStrict(new Date(upcoming[0].startsAt))}`
      : "Nothing scheduled",
    DRAFT: phases.DRAFT
      ? draftsNeedingSetup
        ? `${draftsNeedingSetup} need setup`
        : "All ready to publish"
      : "No drafts",
    COMPLETED:
      toGrade || toPublish
        ? [
            toGrade && `${toGrade} to grade`,
            toPublish && `${toPublish} to publish`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "All results out",
  };

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={
          actions.length
            ? `${actions.length} item${actions.length === 1 ? "" : "s"} need${actions.length === 1 ? "s" : ""} your attention.`
            : "You're all caught up."
        }
        actions={
          <Button asChild>
            <Link href="/exams">
              Go to exams
              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
            </Link>
          </Button>
        }
      />

      {/* Phase cards: count + one line of context; each opens the filtered exam list. */}
      <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((st) => (
          <Link
            key={st.phase}
            href={`/exams?phase=${st.phase}`}
            className="group focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-none"
          >
            <Card interactive className="relative h-full overflow-hidden p-4">
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5 opacity-70",
                  st.accent,
                )}
                aria-hidden="true"
              />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[13px] font-medium">
                  {st.label}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md",
                    st.tone,
                  )}
                >
                  <st.icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
                {phases[st.phase]}
              </p>
              <p className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{context[st.phase]}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden="true"
                />
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <SubmissionsChart
        title="Submissions to your exams"
        series={overview.trend.series}
        previous={overview.trend.previous}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* What to do next */}
          <section aria-labelledby="attention-heading" className="space-y-3">
            <h2
              id="attention-heading"
              className="flex h-8 items-center text-sm font-semibold"
            >
              Needs your attention
            </h2>
            <Card className="overflow-hidden">
              {actions.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-6">
                  <CheckCircle2
                    className="text-success h-5 w-5"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium">All caught up</p>
                    <p className="text-muted-foreground text-xs">
                      Nothing to grade, publish or finish right now.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y">
                  {actions.slice(0, MAX_ACTIONS).map((a) => {
                    const st = ACTION_ICON[a.kind];
                    return (
                      <li key={`${a.kind}-${a.examId}`}>
                        <Link
                          href={`/exams/${a.examId}?tab=${a.tab}`}
                          className="group hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3.5 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                        >
                          <st.icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0",
                              st.tone,
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {a.title}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {a.examTitle}
                            </span>
                          </span>
                          <span className="text-primary flex items-center gap-1 text-xs font-medium">
                            {a.cta}
                            <ArrowRight
                              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                              aria-hidden="true"
                            />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {actions.length > MAX_ACTIONS && (
                <p className="text-muted-foreground border-t px-5 py-2.5 text-xs">
                  +{actions.length - MAX_ACTIONS} more in{" "}
                  <Link
                    href="/exams"
                    className="text-foreground font-medium hover:underline"
                  >
                    Exams
                  </Link>
                </p>
              )}
            </Card>
          </section>
        </div>

        <SchedulePanel
          live={live}
          upcoming={upcoming}
          liveTotal={phases.ONGOING}
          upcomingTotal={phases.UPCOMING}
        />
      </div>
    </>
  );
}
