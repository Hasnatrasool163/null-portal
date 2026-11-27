import { AttemptResultView } from "@/components/attempt-result-view";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Exam Result" };

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["CANDIDATE", "EXAMINER", "ADMIN"]);
  const { id } = await params;
  return <AttemptResultView attemptId={id} />;
}
