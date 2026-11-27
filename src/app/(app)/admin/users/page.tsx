import { UsersManager } from "@/components/users-manager";
import { requireRole } from "@/server/auth/current-user";

export const metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const me = await requireRole(["ADMIN"]);
  return <UsersManager meId={me.id} />;
}
