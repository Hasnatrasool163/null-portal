import { SettingsView } from "@/components/settings-view";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireRole(["ADMIN", "EXAMINER", "CANDIDATE"]);
  return <SettingsView user={user} />;
}
