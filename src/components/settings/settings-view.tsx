"use client";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/blocks";
import { WorkspacePreferencesForm } from "@/components/attempt/preferences-dialog";
import { SettingsSection } from "@/components/settings/settings-section";
import { ThemePicker } from "@/components/settings/theme-picker";
import type { SessionUser } from "@/shared/schemas/auth";

// Re-exported: the account page imports it from here.
export { AccountView } from "@/components/settings/account-view";

/** Settings page: theme for this device, plus exam workspace preferences for candidates. */
export function SettingsView({ user }: { user: SessionUser }) {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={
          user.role === "CANDIDATE"
            ? "Appearance and exam workspace preferences."
            : "Appearance preferences for this device."
        }
      />

      <Card className="space-y-6 p-5 sm:p-6">
        <SettingsSection
          title="Appearance"
          description="Theme for the whole app on this device."
        >
          <ThemePicker />
        </SettingsSection>

        {user.role === "CANDIDATE" && (
          <SettingsSection
            title="Exam workspace"
            description="How exams look and behave for you. Saved to your account, so they follow you to any device."
          >
            <WorkspacePreferencesForm />
          </SettingsSection>
        )}
      </Card>
    </>
  );
}
