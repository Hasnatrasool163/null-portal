"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Moon, Sun, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { ROLE_LABEL, type Role, type SessionUser } from "@/shared/schemas/auth";

// Per-role navigation (one place). Later slices add pages here.
const HOME = { href: "/dashboard", label: "Home", icon: LayoutDashboard };
const NAV: Record<
  Role,
  { href: string; label: string; icon: typeof LayoutDashboard }[]
> = {
  ADMIN: [HOME, { href: "/admin/users", label: "Users", icon: Users }],
  EXAMINER: [HOME],
  CANDIDATE: [HOME],
};

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not log out");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight"
          >
            null-portal
          </Link>
          <nav className="flex flex-1 items-center gap-1" aria-label="Main">
            {NAV[user.role].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                className={cn(
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  pathname.startsWith(href) &&
                    "bg-accent text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm sm:inline">{user.name}</span>
            <Badge>{ROLE_LABEL[user.role]}</Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
