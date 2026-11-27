"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Laptop, Moon, Sun, type LucideIcon } from "lucide-react";
import {
  ThemePreview,
  type ThemeMode,
} from "@/components/settings/theme-preview";
import { cn } from "@/lib/utils";

const THEMES: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

const noop = () => () => {};

/** Light / Dark / System radio cards for this device's theme. */
export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; avoid a hydration mismatch on the selected card.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid gap-3 sm:grid-cols-3"
    >
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
              <t.icon
                className="text-muted-foreground h-4 w-4"
                aria-hidden="true"
              />
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
  );
}
