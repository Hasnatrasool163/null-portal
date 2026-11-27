"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  CircleCheck,
  CloudOff,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MonitorX,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { fieldClass } from "@/components/ui/input";
import { PaletteBackdrop } from "@/components/palette-backdrop";
import { BrandLogo } from "@/components/brand-logo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { api, ApiClientError, applyFieldErrors } from "@/lib/api-client";
import { loginSchema, type LoginInput } from "@/shared/schemas/auth";

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

const SAVE_STATES = [
  {
    icon: CircleCheck,
    title: "All answers saved",
    sub: "Synced to the server.",
    tone: "text-success",
  },
  {
    icon: CloudOff,
    title: "Offline · 3 answers on this device",
    sub: "The timer keeps running. Keep working.",
    tone: "text-warning",
  },
  {
    icon: RefreshCw,
    title: "Back online · syncing 3 answers",
    sub: "Nothing is lost.",
    tone: "text-primary",
  },
] as const;

/* ---------------- Left showcase ---------------- */

function SaveStatusDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setI((x) => (x + 1) % SAVE_STATES.length),
      2800,
    );
    return () => clearInterval(id);
  }, []);
  const s = SAVE_STATES[i];
  return (
    <div className="bg-card shadow-elev-2 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3">
      <s.icon
        key={`i${i}`}
        className={cn("animate-page-in h-5 w-5 shrink-0", s.tone)}
        aria-hidden="true"
      />
      <div key={i} className="animate-page-in min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{s.title}</p>
        <p className="text-muted-foreground truncate text-xs">{s.sub}</p>
      </div>
      <span className="text-muted-foreground self-start font-mono text-[10px]">
        Preview
      </span>
    </div>
  );
}

function ProcessStrip() {
  return (
    <ol className="stagger grid max-w-md grid-cols-5 gap-2">
      {["Create", "Conduct", "Monitor", "Grade", "Verify"].map((s, i) => (
        <li key={s} className="border-primary/70 border-t-2 pt-2">
          <span className="text-muted-foreground block font-mono text-[11px]">
            0{i + 1}
          </span>
          <span className="text-sm font-medium">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Showcase({ role }: { role: RoleKey }) {
  const copy = COPY[role];
  return (
    <aside className="bg-sidebar relative hidden w-[46%] max-w-[680px] shrink-0 flex-col justify-between gap-6 overflow-hidden border-r px-10 py-8 lg:flex xl:px-12">
      <PaletteBackdrop />
      <Link
        href="/"
        className="relative flex w-fit items-center gap-2.5 font-semibold tracking-tight"
      >
        <BrandLogo className="h-9 w-9" />
        {BRAND.name}
      </Link>

      <div className="relative max-w-[520px] space-y-6">
        <div className="space-y-3">
          <p className="text-primary font-mono text-xs">
            create → conduct → verify
          </p>
          <h1
            key={role}
            className="animate-page-in text-[2.1rem] leading-[1.1] font-semibold tracking-tight text-balance xl:text-[2.5rem]"
          >
            {copy.headline}
          </h1>
        </div>

        {role === "candidate" && <SaveStatusDemo />}
        {role === "examiner" && <ProcessStrip />}

        <ul key={role} className="stagger space-y-3">
          {copy.features.map((f, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="bg-card shadow-elev-1 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-md border">
                <f.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="text-muted-foreground text-sm leading-snug">
                {f.text}
              </span>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground flex items-center gap-2 border-t pt-4 text-xs">
          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
          Answer keys never reach the browser before results are published.
        </p>
      </div>

      <p className="text-muted-foreground relative text-xs">
        © {new Date().getFullYear()} {BRAND.name} · {BRAND.tagline}
      </p>
    </aside>
  );
}

/* ---------------- Right form ---------------- */

function IconInput({
  icon: Icon,
  invalid,
  trailing,
  className,
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
          fieldClass,
          "h-10 pl-9",
          trailing ? "pr-10" : "pr-3",
          className,
        )}
      />
      {trailing && (
        <div className="absolute top-1/2 right-1 -translate-y-1/2">
          {trailing}
        </div>
      )}
    </div>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p
      id={id}
      role="alert"
      className="animate-page-in text-destructive text-xs"
    >
      {msg}
    </p>
  );
}

/** Sign-in screen. Accounts are created by an administrator; there is no self sign-up. */
export function AuthForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>("candidate");
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [sessionActive, setSessionActive] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const tab = ROLE_TABS.find((t) => t.key === role)!;

  async function onSubmit(values: LoginInput) {
    setSessionActive(null);
    try {
      await api("/api/auth/login", { method: "POST", body: values });
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.code === "SESSION_ACTIVE") {
        setSessionActive(e.message);
        return;
      }
      if (!applyFieldErrors(e, setError))
        toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function fillDemo() {
    setValue("email", tab.demo, { shouldValidate: true });
    setValue("password", DEMO_PASSWORD, { shouldValidate: true });
  }

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <Showcase role={role} />

      <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 lg:hidden">
          <BrandLogo className="h-9 w-9" />
          <strong className="font-semibold tracking-tight">{BRAND.name}</strong>
        </Link>

        <div className="animate-page-in w-full max-w-[400px] space-y-4">
          <div className="bg-card shadow-elev-2 space-y-5 rounded-lg border p-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-muted-foreground text-sm">
                Use the account your institution gave you.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="I am a"
              className="bg-muted grid grid-cols-3 gap-1 rounded-md p-1"
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
                      "h-8 rounded-[5px] text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
                      on
                        ? "bg-card text-foreground shadow-elev-1"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-3.5"
            >
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <IconInput
                  id="email"
                  type="email"
                  icon={Mail}
                  autoComplete="email"
                  placeholder="you@example.com"
                  invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
                <FieldError id="email-error" msg={errors.email?.message} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <IconInput
                  id="password"
                  type={showPw ? "text" : "password"}
                  icon={Lock}
                  autoComplete="current-password"
                  invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  {...register("password")}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      aria-pressed={showPw}
                      className="text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
                <FieldError
                  id="password-error"
                  msg={errors.password?.message}
                />
                {capsLock && (
                  <p className="text-warning text-xs" role="status">
                    Caps Lock is on.
                  </p>
                )}
              </div>

              {sessionActive && (
                <div
                  role="alert"
                  className="animate-page-in border-warning/40 bg-warning/10 flex gap-2.5 rounded-md border p-3 text-sm"
                >
                  <MonitorX
                    className="text-warning mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="space-y-0.5">
                    <p className="font-medium">Already signed in elsewhere</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {sessionActive}
                    </p>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                Sign in
                {!isSubmitting && (
                  <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5" />
                )}
              </Button>
            </form>

            <button
              type="button"
              onClick={fillDemo}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition-colors"
            >
              <Sparkles
                className="text-primary h-3.5 w-3.5"
                aria-hidden="true"
              />
              Fill demo {tab.label.toLowerCase()}
              <span className="font-mono">({tab.demo})</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
