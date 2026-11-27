import {
  Activity,
  BookOpenCheck,
  CloudOff,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Audience the sign-in screen is currently pitched at (UI only; the server decides the real role). */
export type RoleKey = "candidate" | "examiner" | "admin";

/** Role tabs, each with the seeded demo account it can prefill. */
export const ROLE_TABS: { key: RoleKey; label: string; demo: string }[] = [
  { key: "candidate", label: "Candidate", demo: "candidate1@demo.test" },
  { key: "examiner", label: "Examiner", demo: "examiner1@demo.test" },
  { key: "admin", label: "Admin", demo: "admin@demo.test" },
];
export const DEMO_PASSWORD = "Demo1234";

/** Showcase copy per role. */
export const ROLE_COPY: Record<
  RoleKey,
  { headline: string; features: { icon: LucideIcon; text: string }[] }
> = {
  candidate: {
    headline: "Sit your exam calmly. Every answer is saved as you go.",
    features: [
      {
        icon: CloudOff,
        text: "Answers are kept on your device first. A dropped connection loses nothing.",
      },
      {
        icon: RefreshCw,
        text: "The timer runs on the server. Refreshing never costs you time.",
      },
      { icon: QrCode, text: "Results come with a QR code anyone can verify." },
    ],
  },
  examiner: {
    headline: "Create, run and grade exams from one workspace.",
    features: [
      {
        icon: BookOpenCheck,
        text: "Reuse a private question bank and shuffle every paper.",
      },
      {
        icon: Activity,
        text: "Watch attempts live. Flags are advisory, never automatic penalties.",
      },
      { icon: ShieldCheck, text: "Publish results as verifiable PDF reports." },
    ],
  },
  admin: {
    headline: "Manage people and roles with clear permissions.",
    features: [
      {
        icon: Users,
        text: "Create examiners and admins with a one-time password.",
      },
      {
        icon: UserCog,
        text: "Change roles or deactivate accounts. Access ends immediately.",
      },
      { icon: Lock, text: "Each role sees only what it needs." },
    ],
  },
};
