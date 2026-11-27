"use client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/blocks";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { initials } from "@/lib/format";
import { ROLE_LABEL, type SessionUser } from "@/shared/schemas/auth";

/** Account page: who you are and how you sign in. */
export function AccountView({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader
        title="Account"
        subtitle="Your profile and sign-in security."
      />

      <Card className="space-y-6 p-5 sm:p-6">
        <SettingsSection
          title="Profile"
          description="Managed by your institution."
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="bg-foreground text-background flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name}</p>
              <p className="text-muted-foreground truncate text-sm">
                {ROLE_LABEL[user.role]}
              </p>
            </div>
          </div>
          <dl className="divide-y rounded-lg border text-sm">
            {[
              ["Name", user.name],
              ["Email", user.email],
              ["Role", ROLE_LABEL[user.role]],
            ].map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[5rem_1fr] items-center gap-4 px-4 py-3"
              >
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-2 text-xs">
            To change your name or email, contact your administrator.
          </p>
        </SettingsSection>

        <SettingsSection
          title="Password"
          description="Choose a strong password you don't use elsewhere. Other active sessions will be signed out."
        >
          <ChangePasswordForm />
        </SettingsSection>
      </Card>
    </>
  );
}
