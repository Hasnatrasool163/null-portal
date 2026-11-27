"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MonitorX } from "lucide-react";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api-client";

/** Well inside the server's SESSION_IDLE_SECONDS (120s), even with background-tab timer throttling. */
const HEARTBEAT_MS = 30_000;

type TabState = "checking" | "owner" | "blocked";

/**
 * Enforces one active session on the client side:
 * - Tabs share a cookie, so the server cannot tell them apart. A Web Lock (held for the
 *   tab's lifetime, released automatically on close) lets only one tab use the app.
 *   A blocked tab takes over by itself as soon as the other tab is closed.
 * - The owning tab heartbeats so the server keeps the session marked alive.
 * - If the server says the session is gone (signed out, replaced, revoked), go to /login.
 */
export function useSessionGuard(userId: string): TabState {
  const router = useRouter();
  // No Web Locks (insecure context / very old browser): server-side checks still apply.
  const [state, setState] = useState<TabState>(() =>
    typeof navigator !== "undefined" && !navigator.locks ? "owner" : "checking",
  );

  // One tab per browser.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.locks) return;
    const abort = new AbortController();
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    const name = `np-session:${userId}`;

    let owned = false;
    navigator.locks
      .request(name, { ifAvailable: true }, async (lock) => {
        if (!lock) return;
        owned = true;
        setState("owner");
        await held;
      })
      .then(() => {
        if (owned || abort.signal.aborted) return;
        setState("blocked");
        // Wait in line: becomes the owner once the other tab closes.
        return navigator.locks.request(name, { signal: abort.signal }, async () => {
          setState("owner");
          await held;
        });
      })
      .catch(() => {}); // AbortError on unmount

    return () => {
      abort.abort();
      release();
    };
  }, [userId]);

  // Heartbeat + revoked-session detection (owner tab only).
  useEffect(() => {
    if (state !== "owner") return;
    let stopped = false;
    async function beat() {
      try {
        await api("/api/auth/me");
      } catch (e) {
        if (!stopped && e instanceof ApiClientError && e.status === 401) {
          stopped = true;
          toast.error("Your session has ended. Please sign in again.");
          router.replace("/login");
          router.refresh();
        }
        // Network errors (offline) are ignored; the next beat retries.
      }
    }
    const id = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => document.visibilityState === "visible" && beat();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", beat);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", beat);
    };
  }, [state, router]);

  return state;
}

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
