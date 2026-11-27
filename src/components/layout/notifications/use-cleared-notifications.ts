"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * "Clear" for notifications. There is no delete endpoint, so clearing is a per-browser
 * watermark: everything created at or before the stored timestamp is hidden.
 * Kept in localStorage (wrapped: it can throw in private mode / with blocked storage),
 * with an in-memory fallback so a clear still works for this page load.
 */
const KEY_PREFIX = "np_notifications_cleared_at";

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  } catch {}
  return memory.get(key) ?? null;
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab cleared: follow along.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Per-user when `userId` is known, otherwise one key for the whole browser. */
export function useClearedNotifications(userId?: string) {
  const key = userId ? `${KEY_PREFIX}:${userId}` : KEY_PREFIX;
  // Server snapshot is null, so SSR and hydration render "nothing cleared".
  const clearedAt = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const clear = useCallback(
    (at: string = new Date().toISOString()) => write(key, at),
    [key],
  );

  const clearedMs = clearedAt ? Date.parse(clearedAt) : NaN;
  const isCleared = useCallback(
    (createdAt: string) =>
      !Number.isNaN(clearedMs) && Date.parse(createdAt) <= clearedMs,
    [clearedMs],
  );

  return { clearedAt, clear, isCleared };
}
