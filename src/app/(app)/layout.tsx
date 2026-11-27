import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/server/auth/current-user";

// Guard for every page inside (app): not logged in -> /login.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
