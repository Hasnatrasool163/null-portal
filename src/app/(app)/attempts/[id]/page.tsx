import { ExamWorkspace } from "@/components/attempt/exam-workspace";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Exam" };

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["CANDIDATE", "EXAMINER"]);
  const { id } = await params;
  return <ExamWorkspace attemptId={id} />;
}
