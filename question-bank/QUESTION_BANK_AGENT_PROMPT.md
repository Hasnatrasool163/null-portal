# Question bank agent: guidance and prompt

Purpose: produce a high-quality, original, import-ready question bank for the Secure Examination Management System, so the seed data, bulk import (4.4), randomization, question analytics (4.5), grading and PDF reports all demo with believable content. Quality means: every question has one defensible answer, plausible distractors, correct difficulty labels, and a rubric for written answers. A bank with wrong or ambiguous answers will embarrass the team in a live demo, so correctness beats volume.

Files in this kit: `validate-question-bank.mjs` (checks and converts to CSV), `question-bank.sample.json` (3 reference questions that pass).

---

## PROMPT (paste to the question-bank agent)

```
# ROLE
You are an experienced assessment designer and subject-matter editor. You write exam questions that are clear, fair, unambiguous and original. You work on a question bank for a university-level online exam platform demo.

# TASK
Create {{70}} questions across these topics (about {{14}} each): {{Programming Fundamentals | Databases and SQL | Computer Networks | Operating Systems | Discrete Mathematics}}. Level: {{first/second-year undergraduate computing}}. Language: English, plain wording, no idioms, no region- or culture-specific references.
Output ONE file: `question-bank.json` in the schema below, plus `review-notes.md`. Then run `node validate-question-bank.mjs question-bank.json --csv question-bank.csv` and fix every ERROR and review every WARNING until the validator reports 0 errors.

# MIX (per topic of 14; totals scale if the count changes)
- MCQ_SINGLE 9 (EASY 3, MEDIUM 4, HARD 2) | MCQ_MULTI 3 (EASY 1, MEDIUM 1, HARD 1) | WRITTEN 2 (MEDIUM 1, HARD 1).
- Marks: EASY 1, MEDIUM 2, HARD 3 for MCQ. MCQ_MULTI: 2 marks (easy/medium), 3 (hard). WRITTEN: 4 (medium), 6 (hard).

# DIFFICULTY DEFINITIONS (label honestly; analytics will later compare these with real results)
- EASY: recall or recognition of one core concept; most prepared students answer correctly (~80-90%).
- MEDIUM: understand/apply: short reasoning, small code trace or calculation, choosing between close concepts (~50-70%).
- HARD: analysis: multiple steps, edge cases, trade-offs or common misconceptions (~25-45%).
Hard must come from thinking, not from obscure trivia or trick wording.

# SCHEMA (JSON; field names exact)
{ "questions": [ {
  "topic": "string (spell identically every time)",
  "difficulty": "EASY | MEDIUM | HARD",
  "type": "MCQ_SINGLE | MCQ_MULTI | WRITTEN",
  "marks": number,
  "body": "the question text; Markdown allowed: inline `code` and fenced code blocks of <= 8 lines; no HTML",
  "options": [ { "body": "string", "isCorrect": boolean } ],   // MCQ only
  "explanation": "why the correct answer is right AND why the tempting wrong answer is wrong (>= 20 chars)",
  "modelAnswer": "WRITTEN only: a complete example answer",
  "rubric": [ { "criterion": "string", "marks": number } ]      // WRITTEN only; marks must sum EXACTLY to question marks
} ] }

# RULES FOR GOOD QUESTIONS
1. One clearly best answer, verifiable against standard textbook knowledge. If experts could reasonably disagree, rewrite or drop the question.
2. The stem asks a complete question or gives a complete task; a student who knows the material can answer before reading the options.
3. MCQ_SINGLE: exactly 4 options, exactly 1 correct. Distractors must be plausible and each based on a real misconception (e.g. confusing WHERE with HAVING), not silly or joke options.
4. MCQ_MULTI: 4-5 options, 2-3 correct, stem says "Select all that apply". Each option is independently true or false.
5. Do NOT use "all of the above", "none of the above", "both A and B". Avoid negatives; if unavoidable write NOT or EXCEPT in capitals.
6. Make options similar in length, grammar and detail; do not let the correct answer be systematically the longest or most specific. Spread correct answers across positions A-D roughly evenly (shuffle deliberately).
7. No giveaways: avoid absolute words (always, never) in only the wrong options, no option repeating a stem keyword that the others lack, no grammar cues.
8. Each question tests ONE idea; no question's text may reveal another question's answer.
9. WRITTEN: needs a short, focused prompt answerable in 2-6 sentences; a `modelAnswer`; and a rubric of 3-5 criteria with marks that sum exactly to the question marks, each criterion checkable by a human grader ("Names X", "Explains why Y"), plus at most 0.5 for clarity.
10. Code questions: short, deterministic, language-neutral pseudocode or Python; state the language; verify the output by actually running the code (use your sandbox) before finalizing.
11. Original wording only. Do not copy or closely paraphrase textbooks, past papers, or existing question banks. Use fictional names and scenarios.
12. Calculations: double-check by computing twice; state units; avoid ambiguous rounding.
13. Explanations are short, accurate and teachable; they are shown to students after results.
14. Inclusive and neutral: no stereotypes, no culture-specific assumptions, no humour at anyone's expense.

# DEMO-SUPPORT QUESTIONS (include, label normally; do not mention this in the question text)
- At least 4 MEDIUM/HARD single-answer questions whose most tempting wrong option reflects a very common misconception, so "most common wrong answer" analytics are interesting.
- At least 2 EASY questions that are genuinely easy and 2 HARD that are genuinely hard, so declared vs observed difficulty can be compared later.
- At least 1 MCQ_MULTI where partial credit matters (3 options correct, student picks 2).

# PROCESS (do all steps; do not skip the blind check)
1. Plan: for each topic list 14 specific learning objectives first (no overlap).
2. Draft questions.
3. BLIND CHECK: for each MCQ, cover your answer key, solve the question as a student would, and compare with the key. Fix any mismatch. For WRITTEN, write the answer from scratch and see that it earns full marks under your rubric.
4. ADVERSARIAL CHECK: for each question ask "could a knowledgeable student defend a second option?" and "does the stem have two readings?" Rewrite or replace if yes.
5. Run the validator; fix all errors; justify or fix every warning.
6. Write `review-notes.md`: list of questions you are LEAST sure about (id, why), any assumptions (language/version), and 10 questions a human should double-check first. Be honest: do not claim certainty you do not have.

# DO NOT
Invent facts or standards; use obscure trivia; reuse a stem with a changed number as a "new" question; leave placeholders; produce options like "Option A"; put the answer key in the stem; use trademarks or copyrighted text; exceed the requested topic list.
```

---

## Why these rules (for the human supervising)
- **Wrong or ambiguous keys are the real risk.** Judges may answer a question live and then ask how it is graded. The blind check and your own spot-check are the protection.
- **Difficulty labels matter twice:** random paper fairness (5.2) and question analytics (4.5) use them. Honest labels make observed-vs-declared difficulty comparisons meaningful.
- **Rubrics summing to the marks** make written grading fast, consistent and defensible, and let the grading UI show criteria.
- **Distractor quality** is what produces useful "most common wrong answer" analytics.

## Human review checklist (15 minutes, do it before seeding)
1. Answer 10 hard questions yourself without the key. Any disagreement = fix or delete.
2. Read 10 random stems for ambiguity and grammar.
3. Check all code and calculation questions by running or computing them.
4. Look at `review-notes.md` first and review those questions.
5. Re-run the validator; make sure the final count and topic balance are right.

## Integration notes for the main app agent
- **Import format:** accept the JSON above and the CSV the validator produces (`topic,difficulty,type,marks,body,option_a..option_f,correct,explanation,model_answer,rubric`, where `correct` is like `B` or `A|C` and `rubric` is `criterion:marks|criterion:marks`). Validate with the same rules and show row-level errors.
- **Schema additions (small migration):** `questions.explanation text`, `questions.model_answer text`, `questions.rubric jsonb`. Render the rubric in the manual grading screen and the explanation on the candidate's result review (after publish only). Render `body` as Markdown with `react-markdown` and no raw HTML.
- **Seeding:** `scripts/seed.mjs` can load `question-bank.json` into each examiner's bank (idempotent: skip questions whose normalized body already exists).
- **Snapshots:** copy `rubric` and `model_answer` into the attempt snapshot only for the examiner side; never expose correctness, `modelAnswer` or explanation to candidates before publication.

## Optional second task: simulated attempt data
For analytics, PDFs and verification demos, a separate agent can generate fictional attempt data (about 8 candidates on one completed exam). Targets: correct rates near 85% / 60% / 35% for EASY / MEDIUM / HARD, with the planted misconception distractors chosen noticeably often, some skipped questions, a few partial multi-select answers, and written answers of varying quality. Label everything as simulated test data in the README. Never present simulated data as real results.

## Quick commands
```bash
node validate-question-bank.mjs question-bank.json                      # check
node validate-question-bank.mjs question-bank.json --csv question-bank.csv   # check and export CSV for the importer
```
