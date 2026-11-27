#!/usr/bin/env node
// Usage: node validate-question-bank.mjs bank.json [--csv out.csv]
// Exit code 1 if any ERROR. Warnings are quality smells to review, not blockers.
import fs from "node:fs";

const file = process.argv[2];
if (!file) { console.error("Usage: node validate-question-bank.mjs bank.json [--csv out.csv]"); process.exit(2); }
const csvIdx = process.argv.indexOf("--csv");
const csvOut = csvIdx > -1 ? process.argv[csvIdx + 1] : null;

let data;
try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.error("Cannot read/parse JSON:", e.message); process.exit(2); }
const qs = Array.isArray(data) ? data : data.questions;
if (!Array.isArray(qs)) { console.error('Top level must be an array or { "questions": [...] }'); process.exit(2); }

const errors = [], warns = [];
const E = (i, m) => errors.push(`#${i + 1} ${qs[i]?.topic ?? "?"}: ${m}`);
const W = (i, m) => warns.push(`#${i + 1} ${qs[i]?.topic ?? "?"}: ${m}`);
const TYPES = ["MCQ_SINGLE", "MCQ_MULTI", "WRITTEN"], DIFFS = ["EASY", "MEDIUM", "HARD"];
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
const seen = new Map();
const topicCase = new Map();
const stats = { topics: {}, types: {}, diffs: {} };
const posCount = {}; let singleCount = 0, longestCorrect = 0;
const BAD = /\b(lorem|todo|tbd|xxx|placeholder|option [a-e]\b)/i;
const VAGUE = /\b(all of the above|none of the above|both a and b)\b/i;

qs.forEach((q, i) => {
  for (const k of ["topic", "difficulty", "type", "body"]) if (!q[k] || typeof q[k] !== "string") E(i, `missing "${k}"`);
  if (!TYPES.includes(q.type)) E(i, `type must be one of ${TYPES}`);
  if (!DIFFS.includes(q.difficulty)) E(i, `difficulty must be one of ${DIFFS}`);
  if (typeof q.marks !== "number" || !(q.marks > 0) || q.marks > 10) E(i, "marks must be a number > 0 and <= 10");
  if (typeof q.body === "string") {
    if (q.body.trim().length < 15) E(i, "body too short (< 15 chars)");
    if (q.body.length > 800) W(i, "body is very long (> 800 chars)");
    if (BAD.test(q.body)) E(i, "body contains placeholder text");
    const key = norm(q.body);
    if (seen.has(key)) E(i, `duplicate of #${seen.get(key) + 1}`); else seen.set(key, i);
    if (!/[?:.)]\s*$|```\s*$/.test(q.body.trim())) W(i, "body does not end with ? : or . (check it is a complete question)");
    if (/\b(not|except)\b/.test(q.body)) W(i, "negative phrasing in lowercase: write NOT / EXCEPT in capitals, or rephrase positively");
  }
  if (typeof q.explanation !== "string" || q.explanation.trim().length < 20) E(i, 'missing "explanation" (>= 20 chars): why the answer is right and common wrong answers are wrong');
  if (q.topic) { const k = q.topic.toLowerCase(); if (topicCase.has(k) && topicCase.get(k) !== q.topic) E(i, `topic spelled inconsistently ("${q.topic}" vs "${topicCase.get(k)}")`); topicCase.set(k, q.topic); }
  stats.topics[q.topic] = (stats.topics[q.topic] ?? 0) + 1;
  stats.types[q.type] = (stats.types[q.type] ?? 0) + 1;
  stats.diffs[q.difficulty] = (stats.diffs[q.difficulty] ?? 0) + 1;

  if (q.type === "WRITTEN") {
    if (q.options && q.options.length) E(i, "WRITTEN questions must not have options");
    if (!q.modelAnswer || String(q.modelAnswer).trim().length < 30) E(i, 'WRITTEN needs a "modelAnswer" (>= 30 chars)');
    if (!Array.isArray(q.rubric) || q.rubric.length < 2) E(i, 'WRITTEN needs a "rubric" array of >= 2 {criterion, marks}');
    else {
      const sum = q.rubric.reduce((n, r) => n + (typeof r.marks === "number" ? r.marks : NaN), 0);
      if (q.rubric.some((r) => !r.criterion || !(r.marks > 0))) E(i, "every rubric item needs criterion and marks > 0");
      else if (Math.abs(sum - q.marks) > 1e-9) E(i, `rubric marks sum to ${sum}, question marks are ${q.marks}`);
    }
    if (q.marks < 2) W(i, "written question with < 2 marks: consider an MCQ instead");
  } else if (TYPES.includes(q.type)) {
    const o = q.options;
    if (!Array.isArray(o)) return E(i, "options array required");
    if (o.some((x) => !x || typeof x.body !== "string" || !x.body.trim() || typeof x.isCorrect !== "boolean")) return E(i, "each option needs body (non-empty string) and isCorrect (boolean)");
    const correct = o.filter((x) => x.isCorrect).length;
    const bodies = o.map((x) => norm(x.body));
    if (new Set(bodies).size !== bodies.length) E(i, "duplicate option text");
    if (o.some((x) => BAD.test(x.body))) E(i, "option contains placeholder text");
    if (o.some((x) => VAGUE.test(x.body))) W(i, '"all/none of the above" style option: avoid');
    if (q.type === "MCQ_SINGLE") {
      if (o.length < 3 || o.length > 5) E(i, "MCQ_SINGLE needs 3-5 options (4 recommended)");
      if (correct !== 1) E(i, `MCQ_SINGLE needs exactly 1 correct option, found ${correct}`);
      if (o.length !== 4) W(i, "4 options is the recommended standard");
      singleCount++;
      const idx = o.findIndex((x) => x.isCorrect); if (idx >= 0) posCount[idx] = (posCount[idx] ?? 0) + 1;
      const lens = o.map((x) => x.body.length), max = Math.max(...lens);
      if (idx >= 0 && lens[idx] === max && lens.filter((l) => l === max).length === 1) longestCorrect++;
      if (idx >= 0 && max > 0 && lens[idx] > 2.5 * Math.min(...lens)) W(i, "correct option is much longer than the shortest distractor (test-wise giveaway)");
    } else {
      if (o.length < 4 || o.length > 6) E(i, "MCQ_MULTI needs 4-6 options");
      if (correct < 2) E(i, "MCQ_MULTI needs at least 2 correct options (otherwise make it single-answer)");
      if (correct >= o.length) E(i, "MCQ_MULTI cannot have every option correct");
      if (!/select (all|two|three|\d)|choose (all|two|three|\d)|all that apply/i.test(q.body)) W(i, 'MCQ_MULTI body should say "Select all that apply" or how many to choose');
    }
  }
});

// Distribution checks
const total = qs.length;
const pct = (n) => Math.round((100 * n) / total);
if (singleCount >= 8) {
  for (const [p, n] of Object.entries(posCount)) if (n / singleCount > 0.4) warns.push(`Answer position ${"ABCDE"[p]} is correct in ${Math.round((100 * n) / singleCount)}% of single-answer questions: shuffle positions`);
  if (longestCorrect / singleCount > 0.4) warns.push(`The longest option is the correct one in ${Math.round((100 * longestCorrect) / singleCount)}% of single-answer questions: balance option lengths`);
}
const d = stats.diffs;
if (total >= 20) {
  if (pct(d.EASY ?? 0) < 20 || pct(d.EASY ?? 0) > 40) warns.push(`EASY is ${pct(d.EASY ?? 0)}% (target 20-40%)`);
  if (pct(d.MEDIUM ?? 0) < 35 || pct(d.MEDIUM ?? 0) > 55) warns.push(`MEDIUM is ${pct(d.MEDIUM ?? 0)}% (target 35-55%)`);
  if (pct(d.HARD ?? 0) < 15 || pct(d.HARD ?? 0) > 35) warns.push(`HARD is ${pct(d.HARD ?? 0)}% (target 15-35%)`);
  const w = stats.types.WRITTEN ?? 0, m = stats.types.MCQ_MULTI ?? 0;
  if (pct(w) < 8 || pct(w) > 25) warns.push(`WRITTEN is ${pct(w)}% (target 8-25%)`);
  if (pct(m) < 10 || pct(m) > 30) warns.push(`MCQ_MULTI is ${pct(m)}% (target 10-30%)`);
}
for (const [t, n] of Object.entries(stats.topics)) if (total >= 20 && n < 8) warns.push(`Topic "${t}" has only ${n} questions (>= 8 recommended for random papers)`);

console.log(`\nQuestions: ${total}`);
console.log("Topics:", stats.topics); console.log("Types:", stats.types); console.log("Difficulty:", stats.diffs);
if (singleCount) console.log("Correct-answer position (single):", Object.fromEntries(Object.entries(posCount).map(([p, n]) => ["ABCDE"[p], n])));
console.log(`\nERRORS (${errors.length})`); errors.forEach((x) => console.log("  x", x));
console.log(`WARNINGS (${warns.length})`); warns.forEach((x) => console.log("  !", x));

if (csvOut && !errors.length) {
  const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ["topic", "difficulty", "type", "marks", "body", "option_a", "option_b", "option_c", "option_d", "option_e", "option_f", "correct", "explanation", "model_answer", "rubric"];
  const rows = qs.map((q) => {
    const o = q.options ?? [];
    const correct = o.map((x, i) => (x.isCorrect ? "ABCDEF"[i] : null)).filter(Boolean).join("|");
    return [q.topic, q.difficulty, q.type, q.marks, q.body, ...Array.from({ length: 6 }, (_, i) => o[i]?.body ?? ""), correct, q.explanation, q.modelAnswer ?? "", (q.rubric ?? []).map((r) => `${r.criterion}:${r.marks}`).join("|")].map(esc).join(",");
  });
  fs.writeFileSync(csvOut, [head.join(","), ...rows].join("\n") + "\n");
  console.log(`\nCSV written: ${csvOut}`);
}
process.exit(errors.length ? 1 : 0);
