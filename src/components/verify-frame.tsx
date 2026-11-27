import { AppShell } from "@/components/app-shell";
import { PublicHeader } from "@/components/public-header";
import { getCurrentUser } from "@/server/auth/current-user";
import { getSidebarCollapsed } from "@/server/ui-prefs";

/**
 * Verify pages are public, but a signed-in user who opens them from the sidebar
 * should keep their navigation instead of landing on a dead-end public page.
 */
export async function VerifyFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user)
    return (
      <AppShell user={user} initialCollapsed={await getSidebarCollapsed()}>
        {children}
      </AppShell>
    );
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <PublicHeader />
      <main className="flex flex-1 flex-col py-4 sm:py-8">{children}</main>
    </div>
  );
}
