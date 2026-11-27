/**
 * Display formatting shared across the UI. Keep presentation rules here so
 * the same value never renders two different ways on two screens.
 */
import { format, formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";

type DateInput = string | number | Date;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

/** "Nov 27, 2026 6:40 PM" — the default timestamp everywhere. */
export const formatDateTime = (d: DateInput) => format(toDate(d), "PP p");

/** "Nov 27, 6:40 PM" — compact timestamp for dense tables and lists. */
export const formatShortDateTime = (d: DateInput) =>
  format(toDate(d), "MMM d, p");

/** "Nov 27, 2026" */
export const formatDate = (d: DateInput) => format(toDate(d), "PP");

/** "3 minutes ago" */
export const formatRelative = (d: DateInput) =>
  formatDistanceToNow(toDate(d), { addSuffix: true });

/** "3 minutes" (no "about", no suffix) — for "opens in …" style copy. */
export const formatDistanceStrict = (d: DateInput) =>
  formatDistanceToNowStrict(toDate(d));

/** Score/marks: integers stay integers, everything else gets one decimal. */
export const formatScore = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1);

/** `plural(3, "question")` → "3 questions". */
export const plural = (n: number, word: string, pluralWord = `${word}s`) =>
  `${n} ${n === 1 ? word : pluralWord}`;

/** Countdown clock from milliseconds: "04:09" or "1:04:09". */
export function formatClock(ms: number) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Elapsed seconds as "m:ss" (minutes are not capped at 60). */
export function formatMinutesSeconds(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "Ada Lovelace" → "AL" (at most two letters). */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Byte count as "512 B", "3.4 KB" or "42 KB". */
export const formatFileSize = (bytes: number) =>
  bytes < 1024
    ? `${bytes} B`
    : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
