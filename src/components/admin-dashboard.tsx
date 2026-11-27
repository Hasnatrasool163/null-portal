import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
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
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/blocks";
import { SchedulePanel } from "@/components/schedule-panel";
import { SubmissionsChart } from "@/components/submissions-chart";
import { cn } from "@/lib/utils";
import type { AdminOverview, OversightItem, Phase } from "@/shared/schemas/exam";

type UserStats = { admins: number; examiners: number; candidates: number; inactive: number };

const OVERSIGHT_ICON: Record<OversightItem["kind"], { icon: LucideIcon; tone: string }> = {
  grading: { icon: PenLine, tone: "text-warning" },
  unpublished: { icon: Send, tone: "text-primary" },
  "no-candidates": { icon: UserPlus, tone: "text-warning" },
};
const MAX_ITEMS = 6;

function KpiCard({
  href,
  label,
  value,
  context,
  icon: Icon,
  tone,
  accent,
}: {
  href: string;
  label: string;
  value: number;
  context: string;
  icon: LucideIcon;
  tone: string;
  accent: string;
}) {
  return (
    <Link href={href} className="group focus-visible:ring-ring rounded-lg focus-visible:ring-2 focus-visible:outline-none">
      <Card interactive className="relative h-full overflow-hidden p-4">
        <span className={cn("absolute inset-x-0 top-0 h-0.5 opacity-70", accent)} aria-hidden="true" />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[13px] font-medium">{label}</span>
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", tone)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-xs">
          <span className="truncate">{context}</span>
          <ArrowRight
            className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-[opacity,transform] group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        </p>
      </Card>
    </Link>
  );
}

export function AdminDashboard({
  firstName,
  users,
  phases,
  overview,
}: {
  firstName: string;
  users: UserStats;
  phases: Record<Phase, number>;
  overview: AdminOverview;
}) {
  const totalUsers = users.admins + users.examiners + users.candidates;
  const totalExams = phases.DRAFT + phases.UPCOMING + phases.ONGOING + phases.COMPLETED;

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        subtitle={
          overview.attention.length
            ? `${overview.attention.length} exam${overview.attention.length === 1 ? "" : "s"} may need follow-up with an examiner.`
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
          context={users.inactive ? "Cannot sign in until reactivated" : "No blocked accounts"}
          icon={UserX}
          tone="bg-muted text-muted-foreground"
          accent="bg-muted-foreground/40"
        />
        <KpiCard
          href="/exams?phase=ONGOING"
          label="Live now"
          value={phases.ONGOING}
          context={phases.ONGOING ? `${overview.sitting} candidate${overview.sitting === 1 ? "" : "s"} sitting` : "Nothing running"}
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SubmissionsChart series={overview.trend.series} previous={overview.trend.previous} />
          <SchedulePanel
            live={overview.live}
            upcoming={overview.upcoming}
            liveTotal={phases.ONGOING}
            upcomingTotal={phases.UPCOMING}
          />
        </div>

        <div className="space-y-6">
          {/* Oversight */}
          <section aria-labelledby="oversight-heading" className="space-y-3">
            <h2 id="oversight-heading" className="text-sm font-semibold">
              Needs oversight
            </h2>
            <Card className="overflow-hidden">
              {overview.attention.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-6">
                  <CheckCircle2 className="text-success h-5 w-5" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">Nothing outstanding</p>
                    <p className="text-muted-foreground text-xs">
                      All grading is done, results are out and every published exam has candidates.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y">
                  {overview.attention.slice(0, MAX_ITEMS).map((a) => {
                    const st = OVERSIGHT_ICON[a.kind];
                    return (
                      <li key={`${a.kind}-${a.examId}`}>
                        <Link
                          href={`/exams/${a.examId}`}
                          className="group hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3.5 px-5 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                        >
                          <st.icon className={cn("h-[18px] w-[18px] shrink-0", st.tone)} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{a.title}</span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {a.examTitle} · {a.ownerName}
                            </span>
                          </span>
                          <ArrowRight
                            className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {overview.attention.length > MAX_ITEMS && (
                <p className="text-muted-foreground border-t px-5 py-2.5 text-xs">
                  +{overview.attention.length - MAX_ITEMS} more in{" "}
                  <Link href="/exams" className="text-foreground font-medium hover:underline">
                    Exams
                  </Link>
                </p>
              )}
            </Card>
          </section>
        </div>
      </div>
    </>
  );
}
