import Link from "next/link";
import {
  ArrowRight,
  FilePen,
  PenLine,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/blocks";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SchedulePanel } from "@/components/dashboard/schedule-panel";
import { SubmissionsChart } from "@/components/dashboard/submissions-chart";
import {
  PHASE_STATS,
  phaseContext,
} from "@/components/dashboard/examiner-phase-stats";
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

const MAX_ACTIONS = 6;

/** Examiner home (server component): phase KPIs, submissions trend, to-do list and schedule. */
export function ExaminerDashboard({
  firstName,
  userId,
  phases,
  overview,
}: {
  firstName: string;
  /** Scopes the notification "Clear" to this account (optional). */
  userId?: string;
  phases: Record<Phase, number>;
  overview: ExaminerOverview;
}) {
  const { actions, live, upcoming } = overview;
  const context = phaseContext(phases, overview);

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
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/exams">
                Go to exams
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
            <NotificationBell userId={userId} />
          </div>
        }
      />

      {/* Phase cards: count + one line of context; each opens the filtered exam list. */}
      <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PHASE_STATS.map((st) => (
          <KpiCard
            key={st.phase}
            href={`/exams?phase=${st.phase}`}
            label={st.label}
            value={phases[st.phase]}
            context={context[st.phase]}
            icon={st.icon}
            tone={st.tone}
            accent={st.accent}
          />
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
          <AttentionPanel
            headingId="attention-heading"
            heading="Needs your attention"
            max={MAX_ACTIONS}
            emptyTitle="All caught up"
            emptyText="Nothing to grade, publish or finish right now."
            items={actions.map((a) => ({
              key: `${a.kind}-${a.examId}`,
              href: `/exams/${a.examId}?tab=${a.tab}`,
              ...ACTION_ICON[a.kind],
              title: a.title,
              subtitle: a.examTitle,
              cta: a.cta,
            }))}
          />
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
