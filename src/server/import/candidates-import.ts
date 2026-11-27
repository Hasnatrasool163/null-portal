import "server-only";
import Papa from "papaparse";
import { Errors } from "../http";
import { enrollmentRepo } from "../repositories/enrollment.repo";
import {
  candidateRowSchema,
  type CandidateImportPreview,
  type CandidateImportRowResult,
  type CandidateRow,
} from "@/shared/schemas/exam";

const MAX_ROWS = 200;

export type ValidatedCandidates = {
  preview: CandidateImportPreview;
  valid: (CandidateRow & { existingId?: string })[];
};

/** Parse CSV (name,email) and validate with the shared zod schema. Checks existing accounts without writing. */
export async function validateCandidateImport(
  content: string,
): Promise<ValidatedCandidates> {
  const res = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const headers = res.meta.fields ?? [];
  const missing = ["name", "email"].filter((c) => !headers.includes(c));
  if (missing.length) {
    throw Errors.badRequest(`Missing CSV column(s): ${missing.join(", ")}`);
  }
  if (res.data.length === 0) throw Errors.badRequest("The file has no rows");
  if (res.data.length > MAX_ROWS) {
    throw Errors.badRequest(`Too many rows (max ${MAX_ROWS} per import)`);
  }

  // Gather candidate emails to look up in one query.
  const rawEmails = res.data
    .map((r) => (r.email ?? "").trim().toLowerCase())
    .filter(Boolean);
  const existing = await enrollmentRepo.findUsersByEmails(rawEmails);

  const seen = new Set<string>();
  const rows: CandidateImportRowResult[] = [];
  const valid: (CandidateRow & { existingId?: string })[] = [];
  let newAccounts = 0;

  for (const [i, r] of res.data.entries()) {
    const rowNum = i + 2;
    const rawName = (r.name ?? "").trim();
    const rawEmail = (r.email ?? "").trim().toLowerCase();
    const parsed = candidateRowSchema.safeParse({
      name: rawName,
      email: rawEmail,
    });
    if (!parsed.success) {
      rows.push({
        row: rowNum,
        ok: false,
        name: rawName,
        email: rawEmail,
        kind: "ERROR",
        errors: parsed.error.issues.map((iss) => ({
          field: String(iss.path[0] ?? "row"),
          message: iss.message,
        })),
      });
      continue;
    }

    if (seen.has(parsed.data.email)) {
      rows.push({
        row: rowNum,
        ok: false,
        name: parsed.data.name,
        email: parsed.data.email,
        kind: "ERROR",
        errors: [{ field: "email", message: "Duplicate email in this file" }],
      });
      continue;
    }
    seen.add(parsed.data.email);

    const found = existing.get(parsed.data.email);
    if (found) {
      if (found.role !== "CANDIDATE") {
        rows.push({
          row: rowNum,
          ok: false,
          name: parsed.data.name,
          email: parsed.data.email,
          kind: "ERROR",
          errors: [
            {
              field: "email",
              message: `Account exists with role ${found.role} (only candidates can be enrolled)`,
            },
          ],
        });
        continue;
      }
      if (!found.isActive) {
        rows.push({
          row: rowNum,
          ok: false,
          name: parsed.data.name,
          email: parsed.data.email,
          kind: "ERROR",
          errors: [
            { field: "email", message: "Candidate account is deactivated" },
          ],
        });
        continue;
      }
      valid.push({ ...parsed.data, existingId: found.id });
      rows.push({
        row: rowNum,
        ok: true,
        name: parsed.data.name,
        email: parsed.data.email,
        kind: "EXISTING",
        errors: [],
      });
    } else {
      newAccounts++;
      valid.push(parsed.data);
      rows.push({
        row: rowNum,
        ok: true,
        name: parsed.data.name,
        email: parsed.data.email,
        kind: "NEW",
        errors: [],
      });
    }
  }

  return {
    preview: { total: rows.length, valid: valid.length, newAccounts, rows },
    valid,
  };
}
