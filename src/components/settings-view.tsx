"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Laptop, Moon, Sun, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/blocks";
import { WorkspacePreferencesForm } from "@/components/preferences-dialog";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type SessionUser } from "@/shared/schemas/auth";

const THEMES: { value: "light" | "dark" | "system"; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

// Mini window mock used as the theme preview.
function ThemePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  const pane = (dark: boolean) => (
    <div className={cn("flex h-full flex-1 gap-1.5 p-2", dark ? "bg-[#15181d]" : "bg-[#f6f7f9]")}>
      <div className={cn("w-1/4 rounded-sm", dark ? "bg-[#1c2027]" : "bg-white")} />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className={cn("h-2 w-2/3 rounded-full", dark ? "bg-[#303642]" : "bg-[#d5dae1]")} />
        <div className={cn("h-2 w-1/2 rounded-full", dark ? "bg-[#303642]" : "bg-[#d5dae1]")} />
        <div className="mt-auto h-3 w-8 rounded-sm bg-[#0f6b6e]" />
      </div>
    </div>
  );
  return (
    <div className="flex h-20 overflow-hidden rounded-md border" aria-hidden="true">
      {mode === "system" ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(mode === "dark")
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t pt-6 first:border-t-0 first:pt-0 md:grid-cols-[240px_1fr] md:gap-8">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

const noop = () => () => {};

export function SettingsView({ user }: { user: SessionUser }) {
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; avoid a hydration mismatch on the selected card.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const current = mounted ? (theme ?? "system") : null;

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, exam workspace and account details." />

      <Card className="space-y-6 p-5 sm:p-6">
        <Section title="Appearance" description="Theme for the whole app on this device.">
          <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const on = current === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "group relative space-y-2.5 rounded-lg border p-2.5 text-left transition-[border-color,box-shadow,transform] duration-150",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none motion-safe:active:scale-[0.98]",
                    on
                      ? "border-primary ring-primary/20 ring-[3px]"
                      : "hover:border-foreground/20 hover:shadow-elev-1",
                  )}
                >
                  <ThemePreview mode={t.value} />
                  <span className="flex items-center gap-2 px-0.5 text-sm font-medium">
                    <t.icon className="text-muted-foreground h-4 w-4" aria-hidden="true" />
                    {t.label}
                    <span
                      className={cn(
                        "bg-primary text-primary-foreground ml-auto flex h-5 w-5 items-center justify-center rounded-full transition-[opacity,transform] duration-200",
                        on ? "scale-100 opacity-100" : "scale-50 opacity-0",
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {user.role === "CANDIDATE" && (
          <Section
            title="Exam workspace"
            description="How exams look and behave for you. Saved to your account, so they follow you to any device."
          >
            <WorkspacePreferencesForm />
          </Section>
        )}

        <Section title="Account" description="Managed by your institution.">
          <dl className="divide-y rounded-lg border text-sm">
            {[
              ["Name", user.name],
              ["Email", user.email],
              ["Role", ROLE_LABEL[user.role]],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-2 text-xs">
            To change your name or email, contact your administrator.
          </p>
        </Section>
      </Card>
    </>
  );
}
