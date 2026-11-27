import { AppShell } from "@/components/app-shell";
import { PublicHeader } from "@/components/public-header";
import { getCurrentUser } from "@/server/auth/current-user";

/**
 * Verify pages are public, but a signed-in user who opens them from the sidebar
 * should keep their navigation instead of landing on a dead-end public page.
 */
export async function VerifyFrame({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) return <AppShell user={user}>{children}</AppShell>;
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
      <PublicHeader />
      <main className="flex flex-1 flex-col justify-center py-8 sm:py-12">{children}</main>
    </div>
  );
}
