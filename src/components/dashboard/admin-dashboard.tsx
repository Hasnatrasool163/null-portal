import Link from "next/link";
import {
  ClipboardList,
  PenLine,
  Radio,
  ScrollText,
  Send,
  UserPlus,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/blocks";
import { NotificationBell } from "@/components/layout/notification-bell";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SchedulePanel } from "@/components/dashboard/schedule-panel";
import { SubmissionsChart } from "@/components/dashboard/submissions-chart";
import { plural } from "@/lib/format";
import type {
  AdminOverview,
  OversightItem,
  Phase,
} from "@/shared/schemas/exam";

type UserStats = {
  admins: number;
  examiners: number;
  candidates: number;
  inactive: number;
};

const OVERSIGHT_ICON: Record<
  OversightItem["kind"],
  { icon: LucideIcon; tone: string }
> = {
  grading: { icon: PenLine, tone: "text-warning" },
  unpublished: { icon: Send, tone: "text-primary" },
  "no-candidates": { icon: UserPlus, tone: "text-warning" },
};
const MAX_ITEMS = 6;

/** Admin home (server component): platform KPIs, submissions trend, schedule and oversight list. */
export function AdminDashboard({
  firstName,
  userId,
  users,
  phases,
  overview,
}: {
  firstName: string;
  /** Scopes the notification "Clear" to this account (optional). */
  userId?: string;
  users: UserStats;
  phases: Record<Phase, number>;
  overview: AdminOverview;
}) {
  const totalUsers = users.admins + users.examiners + users.candidates;
  const totalExams =
    phases.DRAFT + phases.UPCOMING + phases.ONGOING + phases.COMPLETED;

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={
          overview.attention.length
            ? `${plural(overview.attention.length, "exam")} may need follow-up with an examiner.`
            : "Everything on the platform looks on track."
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/audit">
                <ScrollText className="h-4 w-4" />
                Audit log
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/users">
                <Users className="h-4 w-4" />
                Manage users
              </Link>
            </Button>
            <NotificationBell userId={userId} />
          </div>
        }
      />

      <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          href="/admin/users"
          label="Users"
          value={totalUsers}
          context={`${users.candidates} candidates · ${users.examiners} examiners · ${users.admins} admins`}
          icon={Users}
          tone="bg-accent text-accent-foreground"
          accent="bg-primary"
        />
        <KpiCard
          href="/admin/users"
          label="Deactivated"
          value={users.inactive}
          context={
            users.inactive
              ? "Cannot sign in until reactivated"
              : "No blocked accounts"
          }
          icon={UserX}
          tone="bg-muted text-muted-foreground"
          accent="bg-muted-foreground/40"
        />
        <KpiCard
          href="/exams?phase=ONGOING"
          label="Live now"
          value={phases.ONGOING}
          context={
            phases.ONGOING
              ? `${plural(overview.sitting, "candidate")} sitting`
              : "Nothing running"
          }
          icon={Radio}
          tone="bg-success/12 text-success"
          accent="bg-success"
        />
        <KpiCard
          href="/exams"
          label="Exams"
          value={totalExams}
          context={`${phases.UPCOMING} upcoming · ${phases.DRAFT} drafts · ${phases.COMPLETED} done`}
          icon={ClipboardList}
          tone="bg-warning/12 text-warning"
          accent="bg-warning"
        />
      </div>

      <SubmissionsChart
        series={overview.trend.series}
        previous={overview.trend.previous}
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SchedulePanel
            live={overview.live}
            upcoming={overview.upcoming}
            liveTotal={phases.ONGOING}
            upcomingTotal={phases.UPCOMING}
          />
        </div>

        <div className="space-y-6">
          <AttentionPanel
            headingId="oversight-heading"
            heading="Needs oversight"
            max={MAX_ITEMS}
            emptyTitle="Nothing outstanding"
            emptyText="All grading is done, results are out and every published exam has candidates."
            items={overview.attention.map((a) => ({
              key: `${a.kind}-${a.examId}`,
              href: `/exams/${a.examId}`,
              ...OVERSIGHT_ICON[a.kind],
              title: a.title,
              subtitle: `${a.examTitle} · ${a.ownerName}`,
            }))}
          />
        </div>
      </div>
    </>
  );
}
