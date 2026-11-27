"use client";
import { usePathname } from "next/navigation";
import {
  SessionBlocked,
  useSessionGuard,
} from "@/components/layout/session-guard";
import { DesktopSidebar } from "@/components/layout/sidebar/desktop-sidebar";
import { useSidebarCollapse } from "@/components/layout/sidebar/use-sidebar-collapse";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useLogout } from "@/components/layout/use-logout";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/shared/schemas/auth";

export { SIDEBAR_COOKIE } from "@/components/layout/sidebar/use-sidebar-collapse";

/** Authenticated app frame: session guard, desktop sidebar, mobile drawer and the content area. */
export function AppShell({
  user,
  initialCollapsed = false,
  children,
}: {
  user: SessionUser;
  /** Read from the sidebar cookie on the server. */
  initialCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarCollapse(initialCollapsed);
  const logout = useLogout();
  const tab = useSessionGuard(user.id);

  // A second tab of the same session: show why, render nothing of the app.
  if (tab === "blocked") return <SessionBlocked />;

  // Focus mode: a live exam attempt gets the whole screen, no navigation.
  if (/^\/attempts\/[^/]+$/.test(pathname)) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">{children}</main>
    );
  }

  return (
    <div className="min-h-screen">
      <DesktopSidebar
        user={user}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onLogout={logout}
      />
      <MobileNav user={user} onLogout={logout} />

      <div
        className={cn(
          "transition-[padding] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          collapsed ? "lg:pl-[72px]" : "lg:pl-60",
        )}
      >
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
