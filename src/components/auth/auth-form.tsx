"use client";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";
import { ROLE_TABS, type RoleKey } from "./role-config";
import { RoleTabs } from "./role-tabs";
import { AuthShowcase } from "./showcase/auth-showcase";

/** Sign-in screen. Accounts are created by an administrator; there is no self sign-up. */
export function AuthForm() {
  const [role, setRole] = useState<RoleKey>("candidate");
  const tab = ROLE_TABS.find((t) => t.key === role)!;

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <AuthShowcase role={role} />

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

            <RoleTabs value={role} onChange={setRole} />

            <LoginForm demo={{ label: tab.label, email: tab.demo }} />
          </div>
        </div>
      </main>
    </div>
  );
}
