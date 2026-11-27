"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import * as D from "@radix-ui/react-dialog";
import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  ShieldCheck,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
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
  CANDIDATE: "Candidate portal",
};

// Collapsed state lives in localStorage; read it as an external store so the
// server render (expanded) and the client agree without an effect + re-render.
const COLLAPSE_KEY = "np.sidebar.collapsed";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const rowBase =
  "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function Brand({ role, compact }: { role: Role; compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="null-portal home">
      <span
        aria-hidden="true"
        className="bg-foreground text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold"
      >
        n/
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-sm font-semibold tracking-tight">null-portal</span>
          <span className="text-muted-foreground block truncate text-[10px] font-medium tracking-[0.12em] uppercase">
            {CONSOLE[role]}
          </span>
        </span>
      )}
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
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Main">
        <ul className="space-y-1">
          {NAV[user.role].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={cn(
                    rowBase,
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-primary text-primary-foreground shadow-elev-1"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t px-3 py-3">
        <button
          type="button"
          onClick={() => setTheme(dark ? "light" : "dark")}
          title={collapsed ? (dark ? "Light mode" : "Dark mode") : undefined}
          className={cn(
            rowBase,
            "text-muted-foreground hover:bg-muted hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {dark ? (
            <Sun className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <Moon className="h-[18px] w-[18px] shrink-0" />
          )}
          {!collapsed && <span>{dark ? "Light mode" : "Dark mode"}</span>}
        </button>

        <div
          className={cn(
            "bg-card flex items-center gap-2.5 rounded-md border p-2",
            collapsed && "justify-center border-transparent bg-transparent p-1",
          )}
          title={collapsed ? `${user.name} · ${ROLE_LABEL[user.role]}` : undefined}
        >
          <span className="bg-foreground text-background flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
            {initials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? "Log out" : undefined}
          className={cn(
            rowBase,
            "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {
      /* storage unavailable: toggle just won't persist */
    }
    listeners.forEach((l) => l());
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
          "bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b px-3",
            collapsed ? "flex-col justify-center gap-2 py-3" : "h-16 justify-between gap-2 pl-4",
          )}
        >
          <Brand role={user.role} compact={collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>
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
            <D.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/40" />
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
          "transition-[padding] duration-200 ease-out",
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
