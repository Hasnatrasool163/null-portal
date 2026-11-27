import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSidebarCollapsed } from "@/server/ui-prefs";

// Guard for every page inside (app): not logged in -> /login.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} initialCollapsed={await getSidebarCollapsed()}>
      {children}
    </AppShell>
  );
}
