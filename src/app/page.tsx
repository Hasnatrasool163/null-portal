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
import { PublicHeader } from "@/components/layout/public-header";
import { PaletteBackdrop } from "@/components/layout/palette-backdrop";
import { VerifyLookup } from "@/components/verify/verify-lookup";
import { getCurrentUser } from "@/server/auth/current-user";

const LANDING_COPY = {
  hero: {
    steps: "create → conduct → monitor → grade → verify",
    headline: "Secure exams, from question bank to verified result.",
    subheading:
      "Timed exams on a server-controlled clock, answers that survive lost connections, and results anyone can verify.",
    cta: "Sign in to your account",
  },
  roles: [
    {
      icon: GraduationCap,
      title: "Candidates",
      text: "Take timed exams with autosave, a private scratchpad and adjustable text size.",
    },
    {
      icon: ClipboardList,
      title: "Examiners",
      text: "Build from your question bank, monitor live attempts, then grade and publish.",
    },
    {
      icon: UserCog,
      title: "Administrators",
      text: "Manage accounts and roles. Deactivated users lose access immediately.",
    },
  ],
  verify: {
    title: "Verify a result report",
    helper: "No account needed. Shows only the exam, score and masked initials.",
    inputLabel: "Verification code",
    buttonLabel: "Verify",
  },
  footer: "© 2026 Null Portal · Secure examination management",
} as const;

export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <PaletteBackdrop className="opacity-[0.05] sm:opacity-[0.07]" />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-4 sm:px-6">
        <PublicHeader verifyHref="#verify" />

        <main className="flex flex-1 flex-col justify-center gap-10 py-10 sm:gap-12 sm:py-14">
          {/* Hero */}
          <section className="animate-page-in max-w-3xl space-y-5 sm:space-y-6">
            <p className="text-primary font-mono text-xs sm:text-sm">
              {LANDING_COPY.hero.steps}
            </p>
            <h1 className="text-[2.25rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
              {LANDING_COPY.hero.headline}
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
              {LANDING_COPY.hero.subheading}
            </p>

            <div className="pt-1">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">
                  {LANDING_COPY.hero.cta}
                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </section>

          {/* Roles */}
          <section aria-label="Roles">
            <div className="stagger grid gap-3 sm:gap-4 md:grid-cols-3">
              {LANDING_COPY.roles.map((r) => (
                <Card
                  key={r.title}
                  className="flex gap-4 p-5 md:flex-col md:gap-3"
                >
                  <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <r.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <h2 className="font-semibold">{r.title}</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {r.text}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Verify */}
          <section
            id="verify"
            aria-labelledby="verify-heading"
            className="scroll-mt-6"
          >
            <Card className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_1.25fr] md:items-center md:gap-8">
              <div className="flex items-start gap-3">
                <span className="bg-success/12 text-success flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="verify-heading" className="font-semibold">
                    {LANDING_COPY.verify.title}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {LANDING_COPY.verify.helper}
                  </p>
                </div>
              </div>
              <VerifyLookup
                label={LANDING_COPY.verify.inputLabel}
                buttonLabel={LANDING_COPY.verify.buttonLabel}
              />
            </Card>
          </section>
        </main>

        <footer className="text-muted-foreground flex flex-col gap-1 border-t py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>{LANDING_COPY.footer}</span>
        </footer>
      </div>
    </div>
  );
}
