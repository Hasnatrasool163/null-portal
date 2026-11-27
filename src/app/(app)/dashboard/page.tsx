import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/blocks";
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Administrators" value={s.admins} />
          <StatCard label="Examiners" value={s.examiners} />
          <StatCard label="Candidates" value={s.candidates} />
          <StatCard label="Deactivated accounts" value={s.inactive} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total exams" value={totalExams} />
          <StatCard label="Ongoing exams" value={phases.ONGOING} />
          <StatCard label="Upcoming exams" value={phases.UPCOMING} />
          <StatCard label="Completed exams" value={phases.COMPLETED} />
        </div>
      </>
    );
  }

  if (user.role === "EXAMINER") {
    const phases = await examService.phaseCounts(user);
    return (
      <>
        <PageHeader
          title={`Welcome, ${first}`}
          subtitle="Your exams by phase. Create drafts, enroll candidates and publish."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/questions">Question bank</Link>
              </Button>
              <Button asChild>
                <Link href="/exams">Manage exams</Link>
              </Button>
            </div>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Ongoing" value={phases.ONGOING} />
          <StatCard label="Upcoming" value={phases.UPCOMING} />
          <StatCard label="Drafts" value={phases.DRAFT} />
          <StatCard label="Completed" value={phases.COMPLETED} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${first}`}
        subtitle="Exams assigned to you will appear here."
      />
      <EmptyState
        title="Candidate exam portal"
        text="Your available, upcoming and completed exams will appear here once S3 is enabled."
      />
    </>
  );
}
