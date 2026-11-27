"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleCheck,
  CloudOff,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { PaletteBackdrop } from "@/components/palette-backdrop";
import { api, applyFieldErrors } from "@/lib/api-client";
import {
  loginSchema,
  registerSchema,
  type RegisterInput,
} from "@/shared/schemas/auth";

type RoleKey = "candidate" | "examiner" | "admin";

const ROLE_TABS: { key: RoleKey; label: string; demo: string }[] = [
  { key: "candidate", label: "Candidate", demo: "candidate1@demo.test" },
  { key: "examiner", label: "Examiner", demo: "examiner1@demo.test" },
  { key: "admin", label: "Admin", demo: "admin@demo.test" },
];
const DEMO_PASSWORD = "Demo1234";

const COPY: Record<
  RoleKey,
  { headline: string; features: { icon: LucideIcon; text: string }[] }
> = {
  candidate: {
    headline: "Sit your exam calmly. Every answer is saved as you go.",
    features: [
      { icon: CloudOff, text: "Answers are kept on your device first, so a dropped connection loses nothing." },
      { icon: RefreshCw, text: "The timer runs on the server, so refreshing or reconnecting never costs you time." },
      { icon: BookOpenCheck, text: "Flag questions, review everything, and use a private scratchpad." },
      { icon: QrCode, text: "Results come with a QR code anyone can verify." },
    ],
  },
  examiner: {
    headline: "Create, run and grade exams from one workspace.",
    features: [
      { icon: BookOpenCheck, text: "Reuse a private question bank and shuffle each paper." },
      { icon: Activity, text: "Watch live attempts. Flags are advisory and never penalise anyone automatically." },
      { icon: CircleCheck, text: "Auto-grade multiple choice, then mark written answers in half points." },
      { icon: ShieldCheck, text: "Publish results as verifiable PDF reports." },
    ],
  },
  admin: {
    headline: "Manage people and roles with clear permissions.",
    features: [
      { icon: Users, text: "Create examiners and admins with a one-time password." },
      { icon: UserCog, text: "Change roles or deactivate accounts. Sessions end immediately." },
      { icon: Lock, text: "Each role sees only what it needs. Other examiners' records are hidden." },
      { icon: Activity, text: "Oversee every exam in read-only mode." },
    ],
  },
};

const STEPS = ["Create", "Conduct", "Monitor", "Grade", "Verify"];

/* ---------------- Left showcase ---------------- */

const SAVE_STATES = [
  { icon: CircleCheck, title: "All answers saved", sub: "Synced to the server.", tone: "text-success" },
  { icon: CloudOff, title: "Offline · 3 answers kept on this device", sub: "The timer keeps running. Keep working.", tone: "text-warning" },
  { icon: RefreshCw, title: "Back online · syncing 3 answers", sub: "Nothing is lost.", tone: "text-primary" },
] as const;

function SaveStatusDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((x) => (x + 1) % SAVE_STATES.length), 2800);
    return () => clearInterval(id);
  }, []);
  const s = SAVE_STATES[i];
  return (
    <div className="bg-card shadow-elev-2 relative max-w-sm overflow-hidden rounded-lg border p-4">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3"
        >
          <s.icon className={cn("h-5 w-5 shrink-0", s.tone, i === 2 && "animate-spin [animation-duration:2s]")} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{s.title}</p>
            <p className="text-muted-foreground text-xs">{s.sub}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      <span className="text-muted-foreground absolute top-2 right-3 font-mono text-[10px] tracking-wider uppercase">
        preview
      </span>
    </div>
  );
}

function ProcessStrip() {
  return (
    <ol className="grid max-w-md grid-cols-5 gap-2">
      {STEPS.map((s, i) => (
        <motion.li
          key={s}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i }}
          className="border-foreground border-t-2 pt-2"
        >
          <span className="text-muted-foreground block font-mono text-[11px]">0{i + 1}</span>
          <span className="text-sm font-medium">{s}</span>
        </motion.li>
      ))}
    </ol>
  );
}

function Showcase({ role }: { role: RoleKey }) {
  const copy = COPY[role];
  return (
    <aside className="bg-sidebar relative hidden w-[46%] max-w-[720px] shrink-0 flex-col justify-between gap-10 overflow-hidden border-r p-10 lg:flex xl:p-12">
      <PaletteBackdrop />
      <Link href="/" className="relative flex w-fit items-center gap-3 text-[17px] font-semibold tracking-tight">
        <span className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm">
          n/
        </span>
        null-portal
      </Link>

      <div className="relative max-w-[540px] space-y-8">
        <div className="space-y-4">
          <p className="text-primary font-mono text-[13px]">create → conduct → verify</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={role}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              className="text-[44px] leading-[1.05] font-semibold tracking-tight text-balance xl:text-5xl"
            >
              {copy.headline}
            </motion.h1>
          </AnimatePresence>
        </div>

        {role === "candidate" && <SaveStatusDemo />}
        {role === "examiner" && <ProcessStrip />}

        <ul className="space-y-4">
          {copy.features.map((f, i) => (
            <motion.li
              key={`${role}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="flex items-center gap-4"
            >
              <span
                className={cn(
                  "bg-card shadow-elev-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                  i === 1 ? "text-primary" : "text-foreground",
                )}
              >
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-muted-foreground text-[15px] leading-snug">{f.text}</span>
            </motion.li>
          ))}
        </ul>

        <p className="text-muted-foreground flex items-center gap-2 border-t pt-4 text-sm">
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Answer keys never reach the browser before results are published.
        </p>
      </div>

      <p className="text-muted-foreground relative flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span>null-portal · Secure examination management</span>
        <Link href="/verify" className="hover:text-foreground underline-offset-4 transition-colors hover:underline">
          Verify a report →
        </Link>
      </p>
    </aside>
  );
}

/* ---------------- Right form ---------------- */

function IconInput({
  icon: Icon,
  invalid,
  trailing,
  ...props
}: React.ComponentProps<"input"> & {
  icon: LucideIcon;
  invalid?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <Icon
        className="text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors"
        aria-hidden="true"
      />
      <input
        {...props}
        aria-invalid={invalid}
        className={cn(
          "border-input bg-card h-11 w-full rounded-lg border pl-9 text-sm transition-[border-color,box-shadow]",
          trailing ? "pr-11" : "pr-3",
          "hover:border-foreground/40 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-4 focus-visible:outline-none",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/20",
        )}
      />
      {trailing && <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</div>}
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return (
    <AnimatePresence initial={false}>
      {msg && (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-destructive overflow-hidden text-xs"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [role, setRole] = useState<RoleKey>("candidate");
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(
      isRegister ? registerSchema : (loginSchema as unknown as typeof registerSchema),
    ),
  });
  const password = watch("password") ?? "";
  const shownRole: RoleKey = isRegister ? "candidate" : role;
  const tab = ROLE_TABS.find((t) => t.key === shownRole)!;

  async function onSubmit(values: RegisterInput) {
    try {
      await api(`/api/auth/${mode}`, { method: "POST", body: values });
      toast.success(isRegister ? "Account created. Welcome!" : "Signed in");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function fillDemo() {
    setValue("email", tab.demo, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  }

  const pwRules = [
    { ok: password.length >= 8, text: "8+ characters" },
    { ok: /[A-Za-z]/.test(password), text: "A letter" },
    { ok: /\d/.test(password), text: "A number" },
  ];

  return (
    <div className="flex min-h-screen">
      <Showcase role={shownRole} />

      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 px-4 py-10 sm:px-6">
        <Link href="/" className="flex flex-col items-center gap-2 text-center lg:hidden">
          <span className="bg-foreground text-background flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm font-semibold">
            n/
          </span>
          <strong className="font-semibold">null-portal</strong>
          <span className="text-muted-foreground text-sm">Secure examination management</span>
        </Link>

        <div className="bg-card shadow-elev-2 animate-page-in w-full max-w-[420px] space-y-6 rounded-lg border p-6 sm:p-7">
          {!isRegister && (
            <div
              role="tablist"
              aria-label="Sign in as"
              className="bg-muted/60 grid grid-cols-3 gap-1 rounded-lg border p-1"
            >
              {ROLE_TABS.map((t) => {
                const on = role === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setRole(t.key)}
                    className={cn(
                      "relative h-10 rounded-lg text-sm font-medium transition-colors motion-safe:active:scale-[0.97]",
                      on ? "text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="role-pill"
                        className="bg-foreground shadow-elev-1 absolute inset-0 rounded-lg"
                        transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className="relative">{t.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">
              {isRegister ? "Create your account" : "Sign in"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isRegister
                ? "Public registration creates a candidate account. Examiners and admins are added by an administrator."
                : `Continue as ${tab.label.toLowerCase()}. Your role comes from your account.`}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium">Full name</label>
                <IconInput
                  id="name"
                  icon={User}
                  autoComplete="name"
                  invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  {...register("name")}
                />
                <FieldError id="name-error" msg={errors.name?.message} />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <IconInput
                id="email"
                type="email"
                icon={Mail}
                autoComplete="email"
                invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              <FieldError id="email-error" msg={errors.email?.message} />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <IconInput
                id="password"
                type={showPw ? "text" : "password"}
                icon={Lock}
                autoComplete={isRegister ? "new-password" : "current-password"}
                invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                {...register("password")}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    aria-pressed={showPw}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <FieldError id="password-error" msg={errors.password?.message} />
              {capsLock && (
                <p className="text-warning text-xs" role="status">Caps Lock is on.</p>
              )}
              {isRegister && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1" aria-label="Password rules">
                  {pwRules.map((r) => (
                    <li
                      key={r.text}
                      className={cn(
                        "flex items-center gap-1.5 text-xs transition-colors",
                        r.ok ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full border transition-all",
                          r.ok ? "border-success bg-success text-white" : "border-input",
                        )}
                      >
                        {r.ok && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      {r.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isRegister ? "Create account" : "Sign in"}
              {!isSubmitting && (
                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
              )}
            </Button>

            {!isRegister && (
              <button
                type="button"
                onClick={fillDemo}
                className="border-input text-muted-foreground hover:border-primary hover:text-foreground hover:bg-accent/50 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-xs transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Use demo {tab.label.toLowerCase()} · <span className="font-mono">{tab.demo}</span>
              </button>
            )}
          </form>

          <p className="text-muted-foreground text-center text-sm">
            {isRegister ? "Already have an account? " : "New candidate? "}
            <Link
              href={isRegister ? "/login" : "/register"}
              className="text-foreground font-semibold underline-offset-4 hover:underline"
            >
              {isRegister ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>

        <Link
          href="/verify"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors lg:hidden"
        >
          <ShieldCheck className="h-4 w-4" /> Verify a result report
        </Link>
      </main>
    </div>
  );
}
