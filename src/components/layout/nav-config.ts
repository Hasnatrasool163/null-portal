import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Scale,
  ScrollText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/shared/schemas/auth";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Per-role navigation (one place).
const HOME: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
};
const VERIFY: NavItem = {
  href: "/verify",
  label: "Verify a report",
  icon: ShieldCheck,
};

export const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    HOME,
    { href: "/admin/users", label: "Users & roles", icon: Users },
    { href: "/exams", label: "Exams", icon: ClipboardList },
    { href: "/admin/disputes", label: "Disputes", icon: Scale },
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

/** Subtitle under the brand name, per role. */
export const CONSOLE: Record<Role, string> = {
  ADMIN: "Admin console",
  EXAMINER: "Examiner console",
  CANDIDATE: "Candidate console",
};
