import Link from "next/link";
import { KeyRound } from "lucide-react";
import { PaletteBackdrop } from "@/components/layout/palette-backdrop";
import { BrandLogo } from "@/components/layout/brand-logo";
import { BRAND } from "@/lib/brand";
import { ROLE_COPY, type RoleKey } from "../role-config";
import { ProcessStrip } from "./process-strip";
import { SaveStatusDemo } from "./save-status-demo";

/** Left marketing panel of the sign-in screen (lg and up); copy follows the selected role. */
export function AuthShowcase({ role }: { role: RoleKey }) {
  const copy = ROLE_COPY[role];
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
