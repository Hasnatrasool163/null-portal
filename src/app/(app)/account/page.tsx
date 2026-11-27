import { AccountView } from "@/components/settings-view";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireRole(["ADMIN", "EXAMINER", "CANDIDATE"]);
  return <AccountView user={user} />;
}
