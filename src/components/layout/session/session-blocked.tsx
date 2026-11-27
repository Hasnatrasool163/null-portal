import { MonitorX } from "lucide-react";

/** Full-screen notice shown in a second tab of the same session. */
export function SessionBlocked() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div
        role="alert"
        className="bg-card shadow-elev-2 w-full max-w-md space-y-3 rounded-lg border p-6 text-center"
      >
        <MonitorX className="text-warning mx-auto h-10 w-10" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight">
          Already open in another tab
        </h1>
        <p className="text-muted-foreground text-sm">
          Your account has an active session in another tab of this browser.
          Only one session is allowed at a time. Close the other tab and this
          one will continue automatically.
        </p>
      </div>
    </main>
  );
}
