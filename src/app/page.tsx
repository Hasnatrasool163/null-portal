import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  CloudOff,
  GraduationCap,
  QrCode,
  ShieldCheck,
  Timer,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicHeader } from "@/components/public-header";
import { PaletteBackdrop } from "@/components/palette-backdrop";
import { VerifyLookup } from "@/components/verify-lookup";
import { BRAND } from "@/lib/brand";
import { getCurrentUser } from "@/server/auth/current-user";

const HIGHLIGHTS = [
  { icon: Timer, text: "Server-enforced timer" },
  { icon: CloudOff, text: "Survives lost connections" },
  { icon: QrCode, text: "Verifiable results" },
];

const ROLES = [
  {
    icon: GraduationCap,
    title: "Candidates",
    text: "Sit timed exams with autosave that survives dropped connections, a private scratchpad and adjustable text size.",
  },
  {
    icon: ClipboardList,
    title: "Examiners",
    text: "Build from a private question bank, preview as a candidate, watch attempts live, then grade and publish.",
  },
  {
    icon: UserCog,
    title: "Administrators",
    text: "Create accounts and assign roles. Deactivated accounts lose access immediately.",
  },
];

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
              create → conduct → monitor → grade → verify
            </p>
            <h1 className="text-[2.25rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.5rem]">
              Secure exams, from question bank to verified result.
            </h1>
            <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
              {BRAND.name} runs timed exams on a server-enforced clock, keeps
              answers safe through lost connections, and gives every published
              result a code anyone can verify.
            </p>

            <div className="pt-1">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">
                  Sign in to your account
                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm">
              {HIGHLIGHTS.map((h) => (
                <li key={h.text} className="flex items-center gap-1.5">
                  <h.icon className="text-primary h-4 w-4" aria-hidden="true" />
                  {h.text}
                </li>
              ))}
            </ul>
          </section>

          {/* Roles */}
          <section aria-labelledby="roles-heading" className="space-y-4">
            <h2 id="roles-heading" className="sr-only">
              Who it is for
            </h2>
            <div className="stagger grid gap-3 sm:gap-4 md:grid-cols-3">
              {ROLES.map((r) => (
                <Card
                  key={r.title}
                  className="flex gap-4 p-5 md:flex-col md:gap-3"
                >
                  <span className="bg-accent text-accent-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <r.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {r.text}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
            <p className="text-muted-foreground text-center text-xs sm:text-left">
              Accounts are created by your institution. Sign in with the email
              and password you were given.
            </p>
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
                    Have a result report?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Check it is genuine and current. No account needed. Only the
                    exam, score and masked initials are shown.
                  </p>
                </div>
              </div>
              <VerifyLookup />
            </Card>
          </section>
        </main>

        <footer className="text-muted-foreground flex flex-col gap-1 border-t py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {BRAND.name} · {BRAND.tagline}
          </span>
          <Link
            href="/login"
            className="hover:text-foreground w-fit transition-colors"
          >
            Sign in →
          </Link>
        </footer>
      </div>
    </div>
  );
}
