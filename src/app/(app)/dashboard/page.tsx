import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/blocks";
import { requireRole } from "@/server/auth/current-user";
import { userService } from "@/server/services/user.service";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireRole(["ADMIN", "EXAMINER", "CANDIDATE"]);
  const first = user.name.split(" ")[0];

  if (user.role === "ADMIN") {
    const s = await userService.stats();
    return (
      <>
        <PageHeader
          title={`Welcome, ${first}`}
          subtitle="Platform oversight: users, roles and access."
          actions={
            <Button asChild>
              <Link href="/admin/users">Manage users</Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Administrators" value={s.admins} />
          <StatCard label="Examiners" value={s.examiners} />
          <StatCard label="Candidates" value={s.candidates} />
          <StatCard label="Deactivated accounts" value={s.inactive} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${first}`}
        subtitle={
          user.role === "EXAMINER"
            ? "Your exams and grading queue will appear here."
            : "Exams assigned to you will appear here."
        }
      />
      <EmptyState
        title={user.role === "EXAMINER" ? "No exams yet" : "No exams assigned"}
        text={
          user.role === "EXAMINER"
            ? "Build your question bank, then create your first exam."
            : "When an examiner enrolls you in an exam it will show up here."
        }
      />
    </>
  );
}
