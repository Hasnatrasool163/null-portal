import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/blocks";
import { CandidateHome } from "@/components/candidate-home";
import { ExaminerDashboard } from "@/components/examiner-dashboard";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Radio,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { requireRole } from "@/server/auth/current-user";
import { userService } from "@/server/services/user.service";
import { examService } from "@/server/services/exam.service";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRole(["ADMIN", "EXAMINER", "CANDIDATE"]);
  const first = user.name.split(" ")[0];

  if (user.role === "ADMIN") {
    const [s, phases] = await Promise.all([
      userService.stats(),
      examService.phaseCounts(user),
    ]);
    const totalExams =
      phases.DRAFT + phases.UPCOMING + phases.ONGOING + phases.COMPLETED;
    return (
      <>
        <PageHeader
          eyebrow="administrator"
          title={`Welcome, ${first}`}
          subtitle="Platform oversight: users, roles and read-only exam overview."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/exams">Inspect exams</Link>
              </Button>
              <Button asChild>
                <Link href="/admin/users">Manage users</Link>
              </Button>
            </div>
          }
        />
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Administrators" value={s.admins} icon={ShieldCheck} />
          <StatCard label="Examiners" value={s.examiners} icon={UserCheck} />
          <StatCard label="Candidates" value={s.candidates} icon={Users} />
          <StatCard label="Deactivated accounts" value={s.inactive} icon={UserX} tone="muted" />
        </div>
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total exams" value={totalExams} icon={ClipboardList} />
          <StatCard label="Ongoing exams" value={phases.ONGOING} icon={Radio} tone="success" />
          <StatCard label="Upcoming exams" value={phases.UPCOMING} icon={CalendarClock} tone="warning" />
          <StatCard label="Completed exams" value={phases.COMPLETED} icon={CheckCircle2} tone="muted" />
        </div>
      </>
    );
  }

  if (user.role === "EXAMINER") {
    const [phases, overview] = await Promise.all([
      examService.phaseCounts(user),
      examService.overview(user),
    ]);
    return <ExaminerDashboard firstName={first} phases={phases} overview={overview} />;
  }

  return <CandidateHome firstName={first} />;
}
