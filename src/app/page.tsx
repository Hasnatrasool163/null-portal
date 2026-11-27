import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { getCurrentUser } from "@/server/auth/current-user";

const ROLES = [
  {
    icon: GraduationCap,
    title: "Candidates",
    text: "Sit timed exams with autosave that survives dropped connections, a private scratchpad and adjustable text size.",
  },
  {
    icon: ClipboardList,
    title: "Examiners",
    text: "Build from a private question bank, preview as a candidate, watch attempts live, grade and publish.",
  },
  {
    icon: UserCog,
    title: "Administrators",
    text: "Manage accounts and roles. Deactivated accounts lose access immediately.",
  },
];

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start justify-center gap-6 px-6">
      <div className="flex items-center gap-2.5">
        <BrandLogo className="h-9 w-9" />
        <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
          null-portal
        </p>
      </div>
      <h1 className="text-4xl font-semibold tracking-tight">
        Secure examinations, from question bank to verified result.
      </h1>
      <p className="text-muted-foreground text-lg">
        Examiners build and monitor timed exams, candidates sit them on a
        server-enforced clock, and every published result carries a code anyone
        can verify.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/register">Register as a candidate</Link>
        </Button>
      </div>
    </main>
  );
}
