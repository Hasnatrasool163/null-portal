import "server-only";
import Papa from "papaparse";
import { Errors } from "../http";
import {
  questionImportRowSchema,
  type ImportPreview,
  type ImportRowResult,
  type ImportPayload,
  type QuestionImportRow,
} from "@/shared/schemas/question";

const MAX_ROWS = 500;
const CSV_COLUMNS = ["topic", "difficulty", "type", "body", "marks"];

type Parsed = { row: number; raw: Record<string, unknown>; errors: Err[] };
type Err = { field: string; message: string };

const upper = (v: unknown) =>
  typeof v === "string" ? v.trim().toUpperCase() : v;

/** CSV: topic,difficulty,type,body,marks,options,correct  (options split by "|", correct = 1-based indexes split by ";"). */
function fromCsv(content: string): Parsed[] {
  const res = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const headers = res.meta.fields ?? [];
  const missing = CSV_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length)
    throw Errors.badRequest(`Missing CSV column(s): ${missing.join(", ")}`);
  return res.data.map((r, i) => {
    const errors: Err[] = [];
    const optionTexts = (r.options ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const correct = new Set<number>();
    for (const part of (r.correct ?? "").split(";").map((s) => s.trim())) {
      if (!part) continue;
      const n = Number(part);
      if (!Number.isInteger(n) || n < 1 || n > optionTexts.length)
        errors.push({
          field: "correct",
          message: `"${part}" is not a valid option number (1-${optionTexts.length})`,
        });
      else correct.add(n - 1);
    }
    return {
      row: i + 2, // row 1 is the header
      errors,
      raw: {
        topicName: r.topic?.trim(),
        difficulty: upper(r.difficulty),
        type: upper(r.type),
        body: r.body,
        defaultMarks: r.marks?.trim() === "" ? undefined : Number(r.marks),
        options: optionTexts.map((body, k) => ({
          body,
          isCorrect: correct.has(k),
        })),
      },
    };
  });
}

/** JSON: [{ topic, difficulty, type, body, marks, options: [{ body, isCorrect }] }] */
function fromJson(content: string): Parsed[] {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw Errors.badRequest("File is not valid JSON");
  }
  if (!Array.isArray(data))
    throw Errors.badRequest("JSON must be an array of questions");
  return data.map((item, i) => {
    const r = (item && typeof item === "object" ? item : {}) as Record<
      string,
      unknown
    >;
    return {
      row: i + 1,
      errors: [],
      raw: {
        topicName: typeof r.topic === "string" ? r.topic.trim() : r.topic,
        difficulty: upper(r.difficulty),
        type: upper(r.type),
        body: r.body,
        defaultMarks: r.marks,
        options: Array.isArray(r.options) ? r.options : [],
      },
    };
  });
}

const FIELD_ALIAS: Record<string, string> = {
  topicName: "topic",
  defaultMarks: "marks",
};

export type ValidatedImport = {
  preview: ImportPreview;
  valid: QuestionImportRow[];
};

/** Parse + validate with the SAME zod schema the API uses. Nothing is written. */
export function validateQuestionImport(p: ImportPayload): ValidatedImport {
  const parsed = p.format === "csv" ? fromCsv(p.content) : fromJson(p.content);
  if (parsed.length === 0) throw Errors.badRequest("The file has no rows");
  if (parsed.length > MAX_ROWS)
    throw Errors.badRequest(`Too many rows (max ${MAX_ROWS} per import)`);

  const rows: ImportRowResult[] = [];
  const valid: QuestionImportRow[] = [];
  for (const pr of parsed) {
    const errors = [...pr.errors];
    let summary = String(pr.raw.body ?? "").slice(0, 80);
    if (errors.length === 0) {
      const r = questionImportRowSchema.safeParse(pr.raw);
      if (r.success) {
        valid.push(r.data);
        summary = r.data.body.slice(0, 80);
      } else {
        for (const i of r.error.issues) {
          const key = String(i.path[0] ?? "row");
          errors.push({ field: FIELD_ALIAS[key] ?? key, message: i.message });
        }
      }
    }
    rows.push({ row: pr.row, ok: errors.length === 0, summary, errors });
  }
  return {
    preview: { total: rows.length, valid: valid.length, rows },
    valid,
  };
}
