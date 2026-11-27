"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import * as D from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
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
const HOME: NavItem = { href: "/dashboard", label: "Home", icon: LayoutDashboard };
const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    HOME,
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/exams", label: "Exams", icon: ClipboardList },
  ],
  EXAMINER: [
    HOME,
    { href: "/exams", label: "Exams", icon: ClipboardList },
    { href: "/questions", label: "Question bank", icon: BookOpen },
  ],
  CANDIDATE: [HOME],
};
const TOOLS: NavItem[] = [
  { href: "/verify", label: "Verify a report", icon: ShieldCheck },
];

const COLLAPSE_KEY = "np.sidebar.collapsed";

// Sidebar collapsed state lives in localStorage; read it as an external store
// so the server render (expanded) and the client agree without a flash.
const collapseListeners = new Set<() => void>();
function subscribeCollapse(cb: () => void) {
  collapseListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    collapseListeners.delete(cb);
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

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight"
    >
      <span
        aria-hidden="true"
        className="bg-foreground text-background flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-sm"
      >
        n/
      </span>
      {!compact && <span className="text-[15px]">null-portal</span>}
    </Link>
  );
}

function NavLinks({
  items,
  pathname,
  collapsed,
  layoutGroup,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  layoutGroup: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "group/nav relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active
                  ? "text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutGroup}
                  className="bg-foreground shadow-elev-2 absolute inset-0 rounded-lg"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                  !active && "group-hover/nav:scale-110",
                )}
                aria-hidden="true"
              />
              {!collapsed && <span className="relative truncate">{label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserCard({
  user,
  collapsed,
  onLogout,
}: {
  user: SessionUser;
  collapsed: boolean;
  onLogout: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const iconBtn =
    "text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring flex h-9 w-9 items-center justify-center rounded-lg transition-[background-color,color,transform] focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-90";
  return (
    <div
      className={cn(
        "bg-card shadow-elev-1 rounded-xl border p-2",
        collapsed ? "flex flex-col items-center gap-1" : "space-y-2",
      )}
    >
      <div className={cn("flex items-center gap-2.5", !collapsed && "px-1 pt-1")}>
        <span
          className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          title={collapsed ? `${user.name} · ${ROLE_LABEL[user.role]}` : undefined}
        >
          {initials(user.name)}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {ROLE_LABEL[user.role]}
            </p>
          </div>
        )}
      </div>
      <div className={cn("flex gap-1", collapsed ? "flex-col" : "border-t pt-2")}>
        <button
          type="button"
          className={iconBtn}
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </button>
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          aria-label="Log out"
          className={cn(
            iconBtn,
            !collapsed &&
              "hover:bg-destructive/10 hover:text-destructive w-auto flex-1 justify-start gap-2 px-3 text-sm font-medium",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </div>
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
  const collapsed = useSyncExternalStore(subscribeCollapse, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {
      /* storage unavailable: the toggle just won't persist */
    }
    collapseListeners.forEach((l) => l());
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
  const focusMode = /^\/attempts\/[^/]+$/.test(pathname);
  if (focusMode) {
    return (
      <div className="min-h-screen">
        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">{children}</main>
      </div>
    );
  }

  const items = NAV[user.role];

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "bg-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col border-r transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center px-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          <Brand compact={collapsed} />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
          {!collapsed && (
            <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
              Workspace
            </p>
          )}
          <NavLinks
            items={items}
            pathname={pathname}
            collapsed={collapsed}
            layoutGroup="nav-active"
          />
          <div className="my-4 border-t" />
          {!collapsed && (
            <p className="text-muted-foreground mb-2 px-3 text-[11px] font-semibold tracking-wider uppercase">
              Tools
            </p>
          )}
          <NavLinks
            items={TOOLS}
            pathname={pathname}
            collapsed={collapsed}
            layoutGroup="nav-active"
          />
        </nav>
        <div className="space-y-2 p-3">
          <UserCard user={user} collapsed={collapsed} onLogout={logout} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 w-full items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors",
              collapsed && "justify-center px-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="bg-background/85 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
        <Brand />
        <D.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <D.Trigger
            className="hover:bg-accent focus-visible:ring-ring flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </D.Trigger>
          <D.Portal>
            <D.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
            <D.Content className="bg-sidebar data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r duration-300 focus:outline-none">
              <D.Title className="sr-only">Navigation</D.Title>
              <D.Description className="sr-only">
                Main navigation and account
              </D.Description>
              <div className="flex h-14 items-center justify-between px-4">
                <Brand />
                <D.Close
                  className="hover:bg-accent flex h-9 w-9 items-center justify-center rounded-lg"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </D.Close>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main">
                <NavLinks
                  items={items}
                  pathname={pathname}
                  collapsed={false}
                  layoutGroup="nav-active-mobile"
                  onNavigate={() => setMobileOpen(false)}
                />
                <div className="my-4 border-t" />
                <NavLinks
                  items={TOOLS}
                  pathname={pathname}
                  collapsed={false}
                  layoutGroup="nav-active-mobile"
                  onNavigate={() => setMobileOpen(false)}
                />
              </nav>
              <div className="p-3">
                <UserCard user={user} collapsed={false} onLogout={logout} />
              </div>
            </D.Content>
          </D.Portal>
        </D.Root>
      </header>

      <div
        className={cn(
          "transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64",
        )}
      >
        <main
          key={pathname}
          className="animate-page-in mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
