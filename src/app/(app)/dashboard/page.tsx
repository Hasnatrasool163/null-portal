import { CandidateHome } from "@/components/candidate-home";
import { ExaminerDashboard } from "@/components/examiner-dashboard";
import { AdminDashboard } from "@/components/admin-dashboard";
import { requireRole } from "@/server/auth/current-user";
import { userService } from "@/server/services/user.service";
import { examService } from "@/server/services/exam.service";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRole(["ADMIN", "EXAMINER", "CANDIDATE"]);
  const first = user.name.split(" ")[0];

  if (user.role === "ADMIN") {
    const [users, phases, overview] = await Promise.all([
      userService.stats(),
      examService.phaseCounts(user),
      examService.adminOverview(user),
    ]);
    return (
      <AdminDashboard
        firstName={first}
        users={users}
        phases={phases}
        overview={overview}
      />
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
