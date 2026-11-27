import { ExamsManager } from "@/components/exams-manager";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Exams" };

export default async function ExamsPage() {
  const user = await requireRole(["EXAMINER", "ADMIN"]);
  return <ExamsManager isAdmin={user.role === "ADMIN"} />;
}
