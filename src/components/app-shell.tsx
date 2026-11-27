"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import * as D from "@radix-ui/react-dialog";
import {
  BookOpen,
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ScrollText,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { Tooltip } from "@/components/ui/tooltip";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { ROLE_LABEL, type Role, type SessionUser } from "@/shared/schemas/auth";

type NavItem = { href: string; label: string; icon: LucideIcon };

// Per-role navigation (one place).
const HOME: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const VERIFY: NavItem = { href: "/verify", label: "Verify a report", icon: ShieldCheck };
const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    HOME,
    { href: "/admin/users", label: "Users & roles", icon: Users },
    { href: "/exams", label: "Exams", icon: ClipboardList },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    VERIFY,
  ],
  EXAMINER: [
    HOME,
    { href: "/exams", label: "Exams", icon: ClipboardList },
    { href: "/questions", label: "Question bank", icon: BookOpen },
    VERIFY,
  ],
  CANDIDATE: [HOME, VERIFY],
};
const CONSOLE: Record<Role, string> = {
  ADMIN: "Admin console",
  EXAMINER: "Examiner console",
  CANDIDATE: "Candidate console",
};

// Collapsed state is a cookie (not localStorage) so the SERVER renders the sidebar
// in its saved state: no expand-then-collapse jump on page load.
export const SIDEBAR_COOKIE = "np_sidebar";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/*
 * Layout rule that makes collapse jerk-free: every row is 48px wide when
 * collapsed and the icon sits at a FIXED 15px inset (15 + 18 + 15 = 48), so
 * icons never move. Labels stay mounted and only fade; the aside clips them.
 */
const row =
  "group/row flex h-10 w-full items-center gap-3 rounded-md px-[15px] text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const icon = "h-[18px] w-[18px] shrink-0";

function Label({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "truncate transition-opacity duration-150",
        collapsed ? "pointer-events-none opacity-0" : "opacity-100 delay-75",
      )}
    >
      {children}
    </span>
  );
}

function Brand({ role, collapsed = false }: { role: Role; collapsed?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex min-w-0 items-center gap-2.5"
      aria-label={`${BRAND.name} home`}
    >
      <BrandLogo className="h-8 w-8 shrink-0" />
      <span
        className={cn(
          "min-w-0 leading-tight whitespace-nowrap transition-opacity duration-150",
          collapsed ? "opacity-0" : "opacity-100 delay-75",
        )}
      >
        <span className="block truncate text-sm font-semibold tracking-tight">{BRAND.name}</span>
        <span className="text-muted-foreground block truncate text-[10px] font-medium">
          {CONSOLE[role]}
        </span>
      </span>
    </Link>
  );
}

function SidebarBody({
  user,
  collapsed,
  onNavigate,
  onLogout,
}: {
  user: SessionUser;
  collapsed: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const settingsActive = pathname === "/settings";
  const muted = "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <>
      <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-3" aria-label="Main">
        <ul className="space-y-1">
          {NAV[user.role].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Tooltip content={label} side="right" disabled={!collapsed}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={cn(
                      row,
                      active ? "bg-primary text-primary-foreground shadow-elev-1" : muted,
                    )}
                  >
                    <Icon className={icon} aria-hidden="true" />
                    <Label collapsed={collapsed}>{label}</Label>
                  </Link>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 overflow-x-hidden border-t px-3 py-3">
        <Tooltip content="Settings" side="right" disabled={!collapsed}>
          <Link
            href="/settings"
            onClick={onNavigate}
            aria-current={settingsActive ? "page" : undefined}
            aria-label={collapsed ? "Settings" : undefined}
            className={cn(
              row,
              settingsActive ? "bg-primary text-primary-foreground shadow-elev-1" : muted,
            )}
          >
            <Settings2 className={icon} aria-hidden="true" />
            <Label collapsed={collapsed}>Settings</Label>
          </Link>
        </Tooltip>

        <Tooltip
          content={
            <span className="block">
              {user.name}
              <span className="block opacity-60">{ROLE_LABEL[user.role]}</span>
            </span>
          }
          side="right"
          disabled={!collapsed}
        >
          <div
            tabIndex={collapsed ? 0 : -1}
            className={cn(
              "flex h-12 items-center gap-2.5 rounded-md border px-[7px] whitespace-nowrap transition-colors duration-150",
              collapsed ? "border-transparent" : "bg-card",
            )}
          >
            <span className="bg-foreground text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
              {initials(user.name)}
            </span>
            <span
              className={cn(
                "min-w-0 leading-tight transition-opacity duration-150",
                collapsed ? "opacity-0" : "opacity-100 delay-75",
              )}
            >
              <span className="block truncate text-sm font-medium">{user.name}</span>
              <span className="text-muted-foreground block truncate text-xs">{user.email}</span>
            </span>
          </div>
        </Tooltip>

        <Tooltip content="Log out" side="right" disabled={!collapsed}>
          <button
            type="button"
            onClick={onLogout}
            aria-label={collapsed ? "Log out" : undefined}
            className={cn(row, "text-muted-foreground hover:bg-destructive/10 hover:text-destructive")}
          >
            <LogOut className={icon} aria-hidden="true" />
            <Label collapsed={collapsed}>Log out</Label>
          </button>
        </Tooltip>
      </div>
    </>
  );
}

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
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not log out");
    }
  }

  // Focus mode: a live exam attempt gets the whole screen, no navigation.
  if (/^\/attempts\/[^/]+$/.test(pathname)) {
    return <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">{children}</main>;
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:flex",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <div className="flex h-16 shrink-0 items-center overflow-hidden border-b pl-5">
          <Brand role={user.role} collapsed={collapsed} />
        </div>

        {/* Edge toggle: same spot in both states, so nothing jumps. */}
        <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} side="right">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 shadow-elev-1 focus-visible:ring-ring absolute top-5 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-[color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-90"
          >
            <ChevronLeft
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-300",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </Tooltip>

        <SidebarBody user={user} collapsed={collapsed} onLogout={logout} />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
        <Brand role={user.role} />
        <D.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <D.Trigger
            className="hover:bg-muted focus-visible:ring-ring flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </D.Trigger>
          <D.Portal>
            <D.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" />
            <D.Content className="bg-sidebar data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r duration-200 focus:outline-none">
              <D.Title className="sr-only">Navigation</D.Title>
              <D.Description className="sr-only">Main navigation and account</D.Description>
              <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                <Brand role={user.role} />
                <D.Close
                  className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </D.Close>
              </div>
              <SidebarBody
                user={user}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
                onLogout={logout}
              />
            </D.Content>
          </D.Portal>
        </D.Root>
      </header>

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
