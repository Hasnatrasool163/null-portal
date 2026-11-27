// Converts question-bank.json into the exact JSON and CSV formats accepted by
// src/server/import/questions-import.ts, and validates every row with PapaParse.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const dir = path.dirname(fileURLToPath(import.meta.url));
const { questions } = JSON.parse(
  fs.readFileSync(path.join(dir, "question-bank.json"), "utf8"),
);

function toAppJson(list) {
  return list.map((q) => ({
    topic: q.topic,
    difficulty: q.difficulty,
    type: q.type,
    body: q.body,
    marks: q.marks,
    options:
      q.type === "WRITTEN"
        ? []
        : q.options.map((o) => ({ body: o.body, isCorrect: o.isCorrect })),
  }));
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toAppCsv(list) {
  const header = "topic,difficulty,type,body,marks,options,correct";
  const rows = list.map((q, idx) => {
    const opts = q.type === "WRITTEN" ? [] : q.options;
    for (const o of opts) {
      if (o.body.includes("|")) {
        throw new Error(`Question #${idx + 1} option contains "|": ${o.body}`);
      }
    }
    const optionsStr = opts.map((o) => o.body.trim()).join("|");
    const correctStr = opts
      .map((o, i) => (o.isCorrect ? String(i + 1) : null))
      .filter(Boolean)
      .join(";");
    return [
      q.topic,
      q.difficulty,
      q.type,
      q.body,
      q.marks,
      optionsStr,
      correctStr,
    ]
      .map(csvCell)
      .join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

// Pick 15 balanced sample questions (3 per topic: 1 MCQ_SINGLE EASY, 1 MCQ_MULTI MEDIUM, 1 WRITTEN HARD/MEDIUM)
const byTopic = new Map();
for (const q of questions) {
  if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
  byTopic.get(q.topic).push(q);
}
const sample = [];
let tIdx = 0;
for (const [, list] of byTopic) {
  const single = list.find((q) => q.type === "MCQ_SINGLE" && q.difficulty === (tIdx % 2 === 0 ? "EASY" : "MEDIUM"));
  const multi = list.find((q) => q.type === "MCQ_MULTI" && q.difficulty === (tIdx % 2 === 0 ? "MEDIUM" : "HARD"));
  const written = list.find((q) => q.type === "WRITTEN" && q.difficulty === (tIdx % 2 === 0 ? "MEDIUM" : "HARD"));
  sample.push(single, multi, written);
  tIdx++;
}

const files = [
  ["import-ready-70.json", JSON.stringify(toAppJson(questions), null, 2) + "\n"],
  ["import-ready-70.csv", toAppCsv(questions)],
  ["sample-import.json", JSON.stringify(toAppJson(sample), null, 2) + "\n"],
  ["sample-import.csv", toAppCsv(sample)],
];

for (const [name, content] of files) {
  fs.writeFileSync(path.join(dir, name), content, "utf8");
}

// Validate CSV round-trip with PapaParse using the exact options from questions-import.ts
for (const name of ["import-ready-70.csv", "sample-import.csv"]) {
  const content = fs.readFileSync(path.join(dir, name), "utf8");
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (parsed.errors.length) {
    console.error(name, "PapaParse errors:", parsed.errors);
    process.exit(1);
  }
  for (const [i, r] of parsed.data.entries()) {
    const opts = (r.options ?? "").split("|").map((s) => s.trim()).filter(Boolean);
    const corr = (r.correct ?? "").split(";").map((s) => s.trim()).filter(Boolean).map(Number);
    if (r.type === "WRITTEN") {
      if (opts.length !== 0 || corr.length !== 0) {
        throw new Error(`${name} row ${i + 2}: WRITTEN should have no options/correct`);
      }
    } else {
      if (opts.length < 2) throw new Error(`${name} row ${i + 2}: <2 options`);
      if (corr.some((n) => !Number.isInteger(n) || n < 1 || n > opts.length)) {
        throw new Error(`${name} row ${i + 2}: invalid correct index`);
      }
      if (r.type === "MCQ_SINGLE" && corr.length !== 1) {
        throw new Error(`${name} row ${i + 2}: MCQ_SINGLE needs 1 correct`);
      }
      if (r.type === "MCQ_MULTI" && corr.length < 1) {
        throw new Error(`${name} row ${i + 2}: MCQ_MULTI needs >=1 correct`);
      }
    }
  }
  console.log(`${name}: ${parsed.data.length} rows verified OK`);
}

for (const name of ["import-ready-70.json", "sample-import.json"]) {
  const arr = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  if (!Array.isArray(arr)) throw new Error(`${name} not an array`);
  console.log(`${name}: ${arr.length} rows verified OK`);
}
