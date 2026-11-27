import { ExamDetailView } from "@/components/exam-detail";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Exam" };

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["EXAMINER", "ADMIN"]);
  const { id } = await params;
  return <ExamDetailView examId={id} isAdmin={user.role === "ADMIN"} />;
}
