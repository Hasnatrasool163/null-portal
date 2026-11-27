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
import { Card } from "@/components/ui/card";
import { PaletteBackdrop } from "@/components/palette-backdrop";
import { VerifyLookup } from "@/components/verify-lookup";
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
    <main className="relative min-h-screen overflow-hidden">
      <PaletteBackdrop className="opacity-[0.1]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="bg-foreground text-background flex h-9 w-9 items-center justify-center rounded-lg font-mono text-sm">
              n/
            </span>
            null-portal
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </header>

        <section className="animate-page-in flex flex-1 flex-col justify-center gap-10 py-16">
          <div className="max-w-3xl space-y-5">
            <p className="text-primary font-mono text-sm">
              create → conduct → monitor → grade → verify
            </p>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              Secure exams, from question bank to verified result.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              The timer runs on the server, answers survive lost connections,
              and every published result carries a code anyone can verify.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/login">
                  Sign in
                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/register">Register as a candidate</Link>
              </Button>
            </div>
          </div>

          <div className="stagger grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <Card key={r.title} interactive className="space-y-2 p-5">
                <span className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center rounded-lg">
                  <r.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-semibold">{r.title}</h2>
                <p className="text-muted-foreground text-sm">{r.text}</p>
              </Card>
            ))}
          </div>

          <Card className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-success mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-semibold">Have a result report?</h2>
                <p className="text-muted-foreground text-sm">
                  Check that it is genuine and current. No account needed.
                </p>
              </div>
            </div>
            <VerifyLookup />
          </Card>
        </section>
      </div>
    </main>
  );
}
