import "server-only";

/**
 * One CSV cell, safe to open in Excel/Sheets/LibreOffice.
 * - Strings that a spreadsheet would treat as a formula (leading = + - @ TAB CR) are
 *   prefixed with a single quote, so `=HYPERLINK(...)` is shown as text, never executed (OWASP).
 * - Real numbers are written as-is (so negative scores stay numeric).
 * - Quotes, commas and newlines are RFC 4180-quoted.
 */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 names correctly.
  return (
    "﻿" +
    [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") +
    "\r\n"
  );
}
