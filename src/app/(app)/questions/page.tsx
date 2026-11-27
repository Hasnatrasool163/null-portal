import { QuestionsManager } from "@/components/questions-manager";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Question bank" };

export default async function QuestionsPage() {
  await requireRole(["EXAMINER"]);
  return <QuestionsManager />;
}
