// Black-box checks against a RUNNING app:  npm run verify   (BASE=http://localhost:3000 by default)
// Extended slice by slice. Exit code 1 if any check fails.
const BASE = process.env.BASE ?? "http://localhost:3000";
const PASSWORD = "Demo1234";
let failed = 0;
let passed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

class Client {
  cookie = "";
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    if (set.length) this.cookie = set.map((c) => c.split(";")[0]).join("; ");
    const json = await res.json().catch(() => null);
    return { status: res.status, json, data: json?.data, error: json?.error };
  }
  get = (p) => this.req("GET", p);
  post = (p, b) => this.req("POST", p, b ?? {});
  patch = (p, b) => this.req("PATCH", p, b);
  del = (p) => this.req("DELETE", p);
}

const sessions = new Map(); // logins are rate limited: log in once per account per run
async function login(email, password = PASSWORD) {
  if (password === PASSWORD && sessions.has(email)) return sessions.get(email);
  const c = new Client();
  const r = await c.post("/api/auth/login", { email, password });
  if (r.status !== 200) throw new Error(`login ${email} -> ${r.status}`);
  if (password === PASSWORD) sessions.set(email, c);
  return c;
}

const sampleQuestion = (topicId, over = {}) => ({
  topicId,
  type: "MCQ_SINGLE",
  difficulty: "EASY",
  body: "Verify question: which is correct?",
  defaultMarks: 1,
  options: [
    { body: "Right", isCorrect: true },
    { body: "Wrong", isCorrect: false },
  ],
  ...over,
});

async function slice0() {
  console.log("S0 roles and guards");
  const anon = new Client();
  check("anonymous -> 401", (await anon.get("/api/admin/users")).status === 401);

  const admin = await login("admin@demo.test");
  const ex1 = await login("examiner1@demo.test");
  const cand = await login("candidate1@demo.test");
  check("examiner cannot list users (403)", (await ex1.get("/api/admin/users")).status === 403);
  check("candidate cannot list users (403)", (await cand.get("/api/admin/users")).status === 403);
  const list = await admin.get("/api/admin/users?pageSize=50");
  check("admin lists users", list.status === 200 && list.data.total >= 11);

  const email = `verify.${Date.now()}@demo.test`;
  const reg = await new Client().post("/api/auth/register", {
    name: "Verify Person",
    email,
    password: "Verify1234",
  });
  check("public register creates CANDIDATE", reg.status === 200 && reg.data.role === "CANDIDATE");

  const created = await admin.post("/api/admin/users", {
    name: "Temp Examiner",
    email: `verify.ex.${Date.now()}@demo.test`,
    role: "EXAMINER",
  });
  check("admin creates user with one-time temp password", created.status === 200 && created.data.tempPassword?.length >= 8);
  const tmp = new Client();
  const tmpLogin = await tmp.post("/api/auth/login", {
    email: created.data.user.email,
    password: created.data.tempPassword,
  });
  check("temp password logs in", tmpLogin.status === 200 && tmpLogin.data.role === "EXAMINER");

  const dup = await admin.post("/api/admin/users", {
    name: "Dup",
    email: created.data.user.email,
    role: "EXAMINER",
  });
  check("duplicate email -> 409 with field error", dup.status === 409 && !!dup.error.fields?.email);

  const off = await admin.patch(`/api/admin/users/${created.data.user.id}`, { isActive: false });
  check("admin deactivates user", off.status === 200 && off.data.isActive === false);
  check("deactivated session stops working (401)", (await tmp.get("/api/topics")).status === 401);
  check(
    "deactivated user cannot log in (403)",
    (await new Client().post("/api/auth/login", { email: created.data.user.email, password: created.data.tempPassword })).status === 403,
  );
  const me = (await admin.get("/api/auth/me")).data;
  check(
    "admin cannot deactivate self (409)",
    (await admin.patch(`/api/admin/users/${me.id}`, { isActive: false })).status === 409,
  );
  check("bad id -> 404", (await admin.patch("/api/admin/users/not-a-uuid", { isActive: true })).status === 404);
}

async function slice1() {
  console.log("S1 question bank");
  const ex1 = await login("examiner1@demo.test");
  const ex2 = await login("examiner2@demo.test");
  const admin = await login("admin@demo.test");
  const cand = await login("candidate1@demo.test");

  check("candidate cannot use question bank (403)", (await cand.get("/api/questions")).status === 403);
  check("admin cannot use question bank (403)", (await admin.get("/api/questions")).status === 403);

  const topics = (await ex1.get("/api/topics")).data;
  check("examiner sees own seeded topics", topics.length >= 3);
  const mine = await ex1.get("/api/questions?pageSize=50");
  check("examiner sees own ~30 questions", mine.data.total >= 30);
  const theirs = await ex2.get("/api/questions?pageSize=50");
  check("examiner2 sees only own questions", theirs.data.total < mine.data.total && theirs.data.total >= 4);

  const first = mine.data.items[0];
  check("other examiner gets 404 for my question", (await ex2.get(`/api/questions/${first.id}`)).status === 404);
  check("other examiner cannot edit my question (404)", (await ex2.patch(`/api/questions/${first.id}`, sampleQuestion((await ex2.get("/api/topics")).data[0].id))).status === 404);

  const t = topics[0].id;
  const two = await ex1.post("/api/questions", sampleQuestion(t, {
    options: [
      { body: "A", isCorrect: true },
      { body: "B", isCorrect: true },
    ],
  }));
  check("single choice with 2 correct -> 400 on options", two.status === 400 && !!two.error.fields?.options);
  const one = await ex1.post("/api/questions", sampleQuestion(t, { options: [{ body: "Only", isCorrect: true }] }));
  check("MCQ with 1 option -> 400", one.status === 400);
  const written = await ex1.post("/api/questions", sampleQuestion(t, { type: "WRITTEN", options: [{ body: "x", isCorrect: false }] }));
  check("written with options -> 400", written.status === 400);
  const foreign = await ex1.post("/api/questions", sampleQuestion((await ex2.get("/api/topics")).data[0].id));
  check("using another examiner's topic -> 400", foreign.status === 400);

  const ok = await ex1.post("/api/questions", sampleQuestion(t));
  check("valid question created", ok.status === 200 && ok.data.options.length === 2);
  const dupe = await ex1.post(`/api/questions/${ok.data.id}/duplicate`);
  check("duplicate copies options", dupe.status === 200 && dupe.data.id !== ok.data.id && dupe.data.options.length === 2);
  const edit = await ex1.patch(`/api/questions/${ok.data.id}`, sampleQuestion(t, { body: "Edited verify question text" }));
  check("edit saves", edit.status === 200 && edit.data.body.startsWith("Edited"));
  check("archive hides question (404)", (await ex1.del(`/api/questions/${ok.data.id}`)).status === 200 && (await ex1.get(`/api/questions/${ok.data.id}`)).status === 404);
  await ex1.del(`/api/questions/${dupe.data.id}`);

  const csv = [
    "topic,difficulty,type,body,marks,options,correct",
    "Verify Import,EASY,MCQ_SINGLE,Valid imported question one?,1,Yes|No,1",
    "Verify Import,MEDIUM,MCQ_SINGLE,Broken: two correct answers?,1,A|B,1;2",
    "Verify Import,HARD,WRITTEN,Valid written imported question,4,,",
    "Verify Import,EXTREME,MCQ_SINGLE,Unknown difficulty row,1,A|B,1",
  ].join("\n");
  const pv = await ex1.post("/api/questions/import/validate", { format: "csv", content: csv });
  check("import preview: 4 rows, 2 valid", pv.status === 200 && pv.data.total === 4 && pv.data.valid === 2);
  check("import preview reports row + field", pv.data.rows[1].errors[0]?.field === "options" && pv.data.rows[3].errors[0]?.field === "difficulty" && pv.data.rows[1].row === 3);
  const before = (await ex1.get("/api/questions")).data.total;
  check("preview wrote nothing", before === mine.data.total);
  const cm = await ex1.post("/api/questions/import/commit", { format: "csv", content: csv });
  check("commit imports only valid rows", cm.status === 200 && cm.data.imported === 2 && cm.data.skipped === 2);
  const after = (await ex1.get("/api/questions")).data.total;
  check("bank grew by 2", after === before + 2);
  const bad = await ex1.post("/api/questions/import/validate", { format: "csv", content: "a,b\n1,2" });
  check("missing columns -> 400", bad.status === 400);

  // clean up what this run created so verify is repeatable
  const imported = (await ex1.get("/api/questions?pageSize=50&q=imported")).data.items;
  for (const q of imported) await ex1.del(`/api/questions/${q.id}`);
  const vt = (await ex1.get("/api/topics")).data.find((x) => x.name === "Verify Import");
  check("topic holding (archived) questions cannot be deleted (409)", !!vt && (await ex1.del(`/api/topics/${vt.id}`)).status === 409);
  const empty = await ex1.post("/api/topics", { name: `Empty ${Date.now()}` });
  check("new topic created", empty.status === 200);
  check("duplicate topic name -> 409", (await ex1.post("/api/topics", { name: empty.data.name.toUpperCase() })).status === 409);
  check("empty topic can be deleted", (await ex1.del(`/api/topics/${empty.data.id}`)).status === 200);
}

async function slice2() {
  console.log("S2 exams, lifecycle, enrollment");
  const admin = await login("admin@demo.test");
  const ex1 = await login("examiner1@demo.test");
  const ex2 = await login("examiner2@demo.test");
  const cand = await login("candidate1@demo.test");

  check("candidate cannot list examiner exams (403)", (await cand.get("/api/exams")).status === 403);
  const adminExams = await admin.get("/api/exams");
  check("admin has read-only list of exams", adminExams.status === 200 && adminExams.data.length >= 5);

  const now = Date.now();
  const baseExam = {
    title: `Verify Exam ${now}`,
    instructions: "Read carefully.",
    startsAt: new Date(now + 3600_000).toISOString(),
    endsAt: new Date(now + 7200_000).toISOString(),
    durationMinutes: 30,
    shuffleQuestions: true,
    shuffleOptions: true,
    multiScoring: "PARTIAL",
    negativeMarking: 0.25,
    showAnswers: true,
    recoveryWindowSeconds: 120,
  };
  check("admin cannot create exam (403)", (await admin.post("/api/exams", baseExam)).status === 403);
  check(
    "invalid window (duration > window) -> 400",
    (await ex1.post("/api/exams", { ...baseExam, durationMinutes: 90 })).status === 400,
  );
  const created = await ex1.post("/api/exams", baseExam);
  check("examiner creates draft exam", created.status === 200 && created.data.phase === "DRAFT");
  const examId = created.data.id;

  check("examiner2 gets 404 on examiner1 exam", (await ex2.get(`/api/exams/${examId}`)).status === 404);
  check("publish blocked with 0 questions (409)", (await ex1.post(`/api/exams/${examId}/publish`)).status === 409);

  // Assign a fresh question to the exam so we can test locking after publish without polluting seeded questions.
  const tId = (await ex1.get("/api/topics")).data[0].id;
  const freshQ = await ex1.post("/api/questions", sampleQuestion(tId, { body: `Lock test question ${now}?` }));
  const setQ = await ex1.put
    ? null
    : await ex1.req("PUT", `/api/exams/${examId}/questions`, {
        items: [{ questionId: freshQ.data.id, marks: 2.5 }],
      });
  check("assign questions computes totalMarks", setQ.status === 200 && setQ.data.totalMarks === 2.5);

  const pub = await ex1.post(`/api/exams/${examId}/publish`);
  check("publish succeeds with >=1 question (phase UPCOMING)", pub.status === 200 && pub.data.phase === "UPCOMING");
  check(
    "question in published exam is locked from edit (409)",
    (await ex1.patch(`/api/questions/${freshQ.data.id}`, sampleQuestion(tId, { body: "Try edit locked" }))).status === 409,
  );
  check(
    "questions cannot be changed after publish (409)",
    (await ex1.req("PUT", `/api/exams/${examId}/questions`, { items: [] })).status === 409,
  );
  check(
    "schedule cannot be changed after publish (409)",
    (await ex1.patch(`/api/exams/${examId}`, { durationMinutes: 40 })).status === 409,
  );
  check(
    "title/instructions remain editable after publish",
    (await ex1.patch(`/api/exams/${examId}`, { title: `Verify Exam Updated ${now}` })).status === 200,
  );

  // Candidate CSV import preview + commit
  const newCandEmail = `verify.cand.${now}@demo.test`;
  const csv = [
    "name,email",
    `New Candidate,${newCandEmail}`,
    "Existing Candidate,candidate1@demo.test",
    "Bad Email,not-an-email",
    "Wrong Role,examiner1@demo.test",
  ].join("\n");
  const pv = await ex1.post(`/api/exams/${examId}/candidates/import/validate`, { content: csv });
  check("candidate import preview: 4 rows, 2 valid, 1 new", pv.status === 200 && pv.data.total === 4 && pv.data.valid === 2 && pv.data.newAccounts === 1);
  const cm = await ex1.post(`/api/exams/${examId}/candidates/import/commit`, { content: csv });
  check("candidate import commits and returns 1 temp password", cm.status === 200 && cm.data.enrolled === 2 && cm.data.created.length === 1);
  const enrolled = await ex1.get(`/api/exams/${examId}/enrollments`);
  check("enrollments list shows 2 candidates", enrolled.status === 200 && enrolled.data.length === 2);

  const closed = await ex1.post(`/api/exams/${examId}/close`);
  check("close transitions exam to COMPLETED", closed.status === 200 && closed.data.phase === "COMPLETED");
}

async function slice3() {
  console.log("S3 candidate exam engine");
  const ex1 = await login("examiner1@demo.test");
  const cand1 = await login("candidate1@demo.test");
  const cand2 = await login("candidate2@demo.test");

  const my = await cand1.get("/api/my/exams");
  check("candidate1 sees enrolled exams", my.status === 200 && my.data.length >= 3);
  const upcoming = my.data.find((e) => e.accessStatus === "UPCOMING");
  check("start before window rejected (409)", !!upcoming && (await cand1.post(`/api/exams/${upcoming.examId}/start`)).status === 409);

  // Create a dedicated live exam enrolled ONLY for candidate1 so verify is repeatable and clean.
  const now = Date.now();
  const qs = (await ex1.get("/api/questions?pageSize=50")).data.items;
  const singleQ = qs.find((q) => q.type === "MCQ_SINGLE");
  const multiQ = qs.find((q) => q.type === "MCQ_MULTI");
  const writtenQ = qs.find((q) => q.type === "WRITTEN");
  const ex = await ex1.post("/api/exams", {
    title: `Verify Live ${now}`,
    instructions: "Live verify exam",
    startsAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now + 3600_000).toISOString(),
    durationMinutes: 15,
    shuffleQuestions: true,
    shuffleOptions: true,
    multiScoring: "PARTIAL",
    negativeMarking: 0.25,
    showAnswers: true,
    recoveryWindowSeconds: 120,
  });
  const examId = ex.data.id;
  await ex1.req("PUT", `/api/exams/${examId}/questions`, {
    items: [
      { questionId: singleQ.id, marks: 2 },
      { questionId: multiQ.id, marks: 3 },
      { questionId: writtenQ.id, marks: 5 },
    ],
  });
  const c1Id = (await cand1.get("/api/auth/me")).data.id;
  await ex1.post(`/api/exams/${examId}/enrollments`, { candidateIds: [c1Id] });
  await ex1.post(`/api/exams/${examId}/publish`);

  check("non-enrolled candidate2 rejected (404)", (await cand2.post(`/api/exams/${examId}/start`)).status === 404);

  const start1 = await cand1.post(`/api/exams/${examId}/start`);
  check("enrolled candidate starts exam", start1.status === 200 && start1.data.questions.length === 3);
  const attemptId = start1.data.id;

  const leaksKey = start1.data.questions.some((q) =>
    q.options.some((o) => "isCorrect" in o || "is_correct" in o),
  );
  check("answer key never sent before publish", !leaksKey);

  const start2 = await cand1.post(`/api/exams/${examId}/start`);
  check(
    "duplicate start returns same attempt and same order",
    start2.status === 200 &&
      start2.data.id === attemptId &&
      start2.data.questions.map((q) => q.id).join(",") ===
        start1.data.questions.map((q) => q.id).join(","),
  );

  check("candidate2 cannot fetch candidate1 attempt (404)", (await cand2.get(`/api/attempts/${attemptId}`)).status === 404);

  const aqSingle = start1.data.questions.find((q) => q.type === "MCQ_SINGLE");
  const aqWritten = start1.data.questions.find((q) => q.type === "WRITTEN");

  const badOpt = await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqSingle.id,
    selectedOptionIds: [999999999],
    seq: 1,
  });
  check("invalid option id rejected (400)", badOpt.status === 400);

  const twoOpts = await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqSingle.id,
    selectedOptionIds: [aqSingle.options[0].id, aqSingle.options[1].id],
    seq: 1,
  });
  check("MCQ_SINGLE with 2 options rejected (400)", twoOpts.status === 400);

  const save1 = await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqSingle.id,
    selectedOptionIds: [aqSingle.options[0].id],
    markedForReview: true,
    seq: 2,
  });
  check("autosave accepted", save1.status === 200 && save1.data.accepted === true);

  const stale = await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqSingle.id,
    selectedOptionIds: [aqSingle.options[1].id],
    seq: 1,
  });
  check("stale seq ignored (idempotent)", stale.status === 200 && stale.data.stale === true);

  await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqWritten.id,
    textAnswer: "A process has its own address space; threads share it.",
    seq: 1,
  });

  const resumed = await cand1.get(`/api/attempts/${attemptId}`);
  const savedSingle = resumed.data.answers.find((a) => a.attemptQuestionId === aqSingle.id);
  check(
    "refresh/resume preserves saved answers and review flag",
    savedSingle?.selectedOptionIds[0] === aqSingle.options[0].id && savedSingle?.markedForReview === true,
  );

  const sub1 = await cand1.post(`/api/attempts/${attemptId}/submit`);
  check("submit succeeds and sets NEEDS_REVIEW (has written)", sub1.status === 200 && sub1.data.gradingStatus === "NEEDS_REVIEW");

  const sub2 = await cand1.post(`/api/attempts/${attemptId}/submit`);
  check("double submit is idempotent", sub2.status === 200 && sub2.data.submittedAt === sub1.data.submittedAt);

  const afterClose = await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqSingle.id,
    selectedOptionIds: [aqSingle.options[1].id],
    seq: 99,
  });
  check("autosave after submit rejected with ATTEMPT_CLOSED (409)", afterClose.status === 409 && afterClose.error.code === "ATTEMPT_CLOSED");

  check("cannot re-start submitted exam (409)", (await cand1.post(`/api/exams/${examId}/start`)).status === 409);

  return { examId, attemptId, aqWrittenId: aqWritten.id };
}

async function slice4(ctx) {
  console.log("S4 grading and results");
  const ex1 = await login("examiner1@demo.test");
  const cand1 = await login("candidate1@demo.test");
  const cand2 = await login("candidate2@demo.test");
  const { examId, attemptId, aqWrittenId } = ctx;

  check(
    "unpublished result hidden from candidate (403)",
    (await cand1.get(`/api/attempts/${attemptId}/result`)).status === 403,
  );
  check(
    "publish results blocked while written ungraded (409)",
    (await ex1.post(`/api/exams/${examId}/results/publish`)).status === 409,
  );

  const g1 = await ex1.get(`/api/exams/${examId}/grading`);
  check("grading overview shows 1 attempt needing review", g1.status === 200 && !g1.data.canPublishResults && g1.data.attempts.length === 1);

  const overMax = await ex1.req("PUT", `/api/attempts/${attemptId}/grade/${aqWrittenId}`, { score: 99 });
  check("written grade exceeding max marks rejected (400)", overMax.status === 400);

  const badStep = await ex1.req("PUT", `/api/attempts/${attemptId}/grade/${aqWrittenId}`, { score: 2.3 });
  check("written grade not in 0.5 steps rejected (400)", badStep.status === 400);

  const graded = await ex1.req("PUT", `/api/attempts/${attemptId}/grade/${aqWrittenId}`, {
    score: 4.5,
    feedback: "Strong distinction between process and thread.",
  });
  check("valid written grade transitions attempt to GRADED", graded.status === 200 && graded.data.gradingStatus === "GRADED");

  const pub = await ex1.post(`/api/exams/${examId}/results/publish`);
  check("publish results succeeds once all attempts graded", pub.status === 200 && !!pub.data.resultsPublishedAt);

  const res1 = await cand1.get(`/api/attempts/${attemptId}/result`);
  check(
    "candidate1 views own published result with answer key",
    res1.status === 200 &&
      res1.data.totalScore >= 0 &&
      res1.data.questions.some((q) => q.options.some((o) => typeof o.isCorrect === "boolean")),
  );
  check(
    "candidate2 cannot view candidate1 result (404)",
    (await cand2.get(`/api/attempts/${attemptId}/result`)).status === 404,
  );
}

async function slice5() {
  console.log("S5 monitoring, incidents, announcements, extensions");
  const ex1 = await login("examiner1@demo.test");
  const cand1 = await login("candidate1@demo.test");
  const now = Date.now();
  const qs = (await ex1.get("/api/questions?pageSize=5")).data.items;
  const ex = await ex1.post("/api/exams", {
    title: `Verify Monitor ${now}`,
    instructions: "Monitor test",
    startsAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now + 3600_000).toISOString(),
    durationMinutes: 10,
    shuffleQuestions: false,
    shuffleOptions: false,
    multiScoring: "PARTIAL",
    negativeMarking: 0,
    showAnswers: true,
    recoveryWindowSeconds: 120,
  });
  const examId = ex.data.id;
  await ex1.req("PUT", `/api/exams/${examId}/questions`, {
    items: [{ questionId: qs[0].id, marks: 1 }],
  });
  const c1Id = (await cand1.get("/api/auth/me")).data.id;
  await ex1.post(`/api/exams/${examId}/enrollments`, { candidateIds: [c1Id] });
  await ex1.post(`/api/exams/${examId}/publish`);

  const started = await cand1.post(`/api/exams/${examId}/start`);
  const attemptId = started.data.id;
  const origDeadline = Date.parse(started.data.deadlineAt);

  const ann = await ex1.post(`/api/exams/${examId}/announcements`, {
    message: "Clarification: question 1 has one answer.",
  });
  check("examiner posts announcement", ann.status === 200);

  const inc = await cand1.post(`/api/attempts/${attemptId}/incidents`, {
    type: "TAB_HIDDEN",
  });
  check("advisory incident logged", inc.status === 200 && inc.data.recorded === true);

  const ext = await ex1.post(`/api/attempts/${attemptId}/extensions`, {
    minutes: 5,
    reason: "Verified power outage in lab",
  });
  check(
    "examiner grants audited time extension",
    ext.status === 200 && Date.parse(ext.data.newDeadlineAt) > origDeadline,
  );

  const hb = await cand1.post(`/api/attempts/${attemptId}/heartbeat`);
  check(
    "heartbeat delivers announcement and extended deadline",
    hb.status === 200 &&
      hb.data.announcements.length === 1 &&
      Date.parse(hb.data.deadlineAt) > origDeadline,
  );

  const mon = await ex1.get(`/api/exams/${examId}/monitor`);
  check(
    "live monitor shows attempt, incident count, and extension",
    mon.status === 200 &&
      mon.data.attempts.length === 1 &&
      mon.data.attempts[0].incidentCount === 1 &&
      mon.data.attempts[0].extensions.length === 1,
  );

  await cand1.post(`/api/attempts/${attemptId}/submit`);
  check(
    "cannot extend already submitted attempt (409)",
    (await ex1.post(`/api/attempts/${attemptId}/extensions`, { minutes: 5, reason: "Too late" })).status === 409,
  );
}

async function slice6(ctx) {
  console.log("S6 secondary features");
  const ex1 = await login("examiner1@demo.test");
  const cand1 = await login("candidate1@demo.test");
  const { examId, attemptId, aqWrittenId } = ctx;

  // 1. /api/ping
  const ping = await new Client().get("/api/ping");
  check("/api/ping responds with serverNow", ping.status === 200 && !!ping.data.serverNow);

  // 2. Preferences server-side persistence
  const pSave = await cand1.patch("/api/me/preferences", { fontSize: "lg", theme: "high-contrast" });
  const pRead = await cand1.get("/api/me/preferences");
  check("workspace preferences persist server-side", pSave.status === 200 && pRead.data.fontSize === "lg" && pRead.data.theme === "high-contrast");
  await cand1.patch("/api/me/preferences", { fontSize: "md", theme: "light" });

  // 3. Sandbox preview & exclusion from stats/grading
  const sb = await ex1.post(`/api/exams/${examId}/sandbox`, { reset: true });
  check("examiner starts sandbox attempt", sb.status === 200 && !!sb.data.attemptId);
  const sbState = await ex1.get(`/api/attempts/${sb.data.attemptId}`);
  check("sandbox attempt flagged isSandbox=true", sbState.status === 200 && sbState.data.isSandbox === true);

  // 4. Scratchpad save on sandbox attempt
  const sp = await ex1.req("PUT", `/api/attempts/${sb.data.attemptId}/scratchpad`, { scratchpad: "Rough note 123" });
  const sbAfter = await ex1.get(`/api/attempts/${sb.data.attemptId}`);
  check("scratchpad autosaves and persists", sp.status === 200 && sbAfter.data.scratchpad === "Rough note 123");

  await ex1.post(`/api/attempts/${sb.data.attemptId}/submit`);

  // 5. Question analytics excludes sandbox
  const an = await ex1.get(`/api/exams/${examId}/analytics`);
  check(
    "analytics excludes sandbox attempts (only 1 real attempt)",
    an.status === 200 && an.data.submittedAttempts === 1 && an.data.questions.length === 3,
  );

  // 6. Server-side PDF + QR verification (VALID -> grade change -> SUPERSEDED)
  const pdfRes = await fetch(`${BASE}/api/attempts/${attemptId}/report.pdf`, {
    headers: { cookie: cand1.cookie },
  });
  const code = pdfRes.headers.get("x-verification-code");
  const pdfBytes = new Uint8Array(await pdfRes.arrayBuffer());
  const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));
  check(
    "candidate PDF generated server-side with verification code",
    pdfRes.status === 200 && pdfHeader === "%PDF-" && !!code && code.length >= 12,
  );

  const ver1 = await new Client().get(`/api/verify/${code}`);
  check(
    "public verify shows VALID with masked name and no email",
    ver1.status === 200 &&
      ver1.data.status === "VALID" &&
      ver1.data.maskedCandidateName.includes(".") &&
      !("email" in ver1.data),
  );

  // Change grade slightly -> old verification code becomes SUPERSEDED
  await ex1.req("PUT", `/api/attempts/${attemptId}/grade/${aqWrittenId}`, { score: 4 });
  const ver2 = await new Client().get(`/api/verify/${code}`);
  check("grade change marks old PDF verification SUPERSEDED", ver2.status === 200 && ver2.data.status === "SUPERSEDED");

  // 7. Examiner summary PDF
  const exPdf = await fetch(`${BASE}/api/exams/${examId}/report.pdf`, {
    headers: { cookie: ex1.cookie },
  });
  check("examiner summary PDF generated server-side", exPdf.status === 200 && exPdf.headers.get("content-type")?.includes("pdf"));
}

async function slice7() {
  console.log("S7 innovation 5.3 failure-resilient sync");
  const ex1 = await login("examiner1@demo.test");
  const cand1 = await login("candidate1@demo.test");
  const now = Date.now();
  const qs = (await ex1.get("/api/questions?pageSize=50")).data.items;
  const singleQ = qs.find((q) => q.type === "MCQ_SINGLE");
  const multiQ = qs.find((q) => q.type === "MCQ_MULTI");

  // Create a 1-minute exam with 120s recovery window, start it, sync normally, then test recovery rules.
  const ex = await ex1.post("/api/exams", {
    title: `Verify Sync ${now}`,
    instructions: "Sync test",
    startsAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now + 3600_000).toISOString(),
    durationMinutes: 10,
    shuffleQuestions: false,
    shuffleOptions: false,
    multiScoring: "PARTIAL",
    negativeMarking: 0,
    showAnswers: true,
    recoveryWindowSeconds: 120,
  });
  const examId = ex.data.id;
  await ex1.req("PUT", `/api/exams/${examId}/questions`, {
    items: [
      { questionId: singleQ.id, marks: 2 },
      { questionId: multiQ.id, marks: 2 },
    ],
  });
  const c1Id = (await cand1.get("/api/auth/me")).data.id;
  await ex1.post(`/api/exams/${examId}/enrollments`, { candidateIds: [c1Id] });
  await ex1.post(`/api/exams/${examId}/publish`);

  const start = await cand1.post(`/api/exams/${examId}/start`);
  const attemptId = start.data.id;
  const q0 = start.data.questions[0];
  const q1 = start.data.questions[1];

  const batch = await cand1.post(`/api/attempts/${attemptId}/sync`, {
    items: [
      {
        attemptQuestionId: q0.id,
        selectedOptionIds: [q0.options[0].id],
        seq: 1,
        capturedElapsedMs: 5000,
      },
      {
        attemptQuestionId: q1.id,
        selectedOptionIds: [q1.options[0].id],
        seq: 1,
        capturedElapsedMs: 6000,
      },
    ],
  });
  check("normal batch /sync accepts 2 queued answers", batch.status === 200 && batch.data.accepted === 2 && batch.data.acceptedLate === 0);

  // User-submitted attempt rejects further syncs with ALREADY_SUBMITTED
  await cand1.post(`/api/attempts/${attemptId}/submit`);
  const afterUserSubmit = await cand1.post(`/api/attempts/${attemptId}/sync`, {
    items: [
      {
        attemptQuestionId: q0.id,
        selectedOptionIds: [q0.options[1].id],
        seq: 2,
        capturedElapsedMs: 7000,
      },
    ],
  });
  check(
    "sync after explicit user submit is rejected",
    afterUserSubmit.status === 200 &&
      afterUserSubmit.data.rejected === 1 &&
      afterUserSubmit.data.results[0].reason === "ALREADY_SUBMITTED",
  );

  // Test bounded late-sync recovery + plausibility rejection + examiner discard using candidate2
  const cand2 = await login("candidate2@demo.test");
  const c2Id = (await cand2.get("/api/auth/me")).data.id;
  await ex1.post(`/api/exams/${examId}/enrollments`, { candidateIds: [c2Id] });
  const start2 = await cand2.post(`/api/exams/${examId}/start`);
  const att2 = start2.data.id;
  const q2_0 = start2.data.questions[0];

  // Move att2's started_at & deadline_at back so it expired 15s ago (inside 120s recovery window)
  const { connect } = await import("./_db.mjs");
  const db = connect();
  await db.connect();
  try {
    await db.query(
      "UPDATE attempts SET started_at = now() - interval '615 seconds', deadline_at = now() - interval '15 seconds' WHERE id = $1",
      [att2],
    );
  } finally {
    await db.end();
  }

  // 1) Implausible capturedElapsedMs (> allowed 600s) is rejected
  const badLate = await cand2.post(`/api/attempts/${att2}/sync`, {
    items: [
      {
        attemptQuestionId: q2_0.id,
        selectedOptionIds: [q2_0.options[0].id],
        seq: 1,
        capturedElapsedMs: 650_000,
      },
    ],
  });
  check(
    "late sync captured after deadline rejected (CAPTURED_AFTER_DEADLINE)",
    badLate.status === 200 &&
      badLate.data.rejected === 1 &&
      badLate.data.results[0].reason === "CAPTURED_AFTER_DEADLINE",
  );

  // 2) Valid late sync captured before deadline (at 550s < 600s) accepted within recovery window
  const goodLate = await cand2.post(`/api/attempts/${att2}/sync`, {
    items: [
      {
        attemptQuestionId: q2_0.id,
        selectedOptionIds: [q2_0.options[0].id],
        seq: 2,
        capturedElapsedMs: 550_000,
      },
    ],
  });
  check(
    "valid late sync within recovery window accepted as ACCEPTED_LATE",
    goodLate.status === 200 && goodLate.data.acceptedLate === 1,
  );

  // 3) Examiner sees syncedLate in grading & can discard it
  const gr = await ex1.get(`/api/exams/${examId}/grading`);
  const a2 = gr.data.attempts.find((a) => a.attemptId === att2);
  const lateAns = a2?.answers.find((a) => a.syncedLate);
  check("examiner grading flags late-synced answer", !!lateAns && !!lateAns.answerId);
  if (lateAns?.answerId) {
    const disc = await ex1.post(`/api/attempts/${att2}/discard-late/${lateAns.answerId}`);
    check("examiner discards late-synced answer", disc.status === 200 && disc.data.discarded === true);
  }
}

async function securityRegression() {
  console.log("Security regression (ADM-108 & ADV-131)");
  // ADM-108: copied session cookie must return 401 after /api/auth/logout
  const regEmail = `verify.sec.${Date.now()}@demo.test`;
  const c = new Client();
  const reg = await c.post("/api/auth/register", {
    name: "Logout Test",
    email: regEmail,
    password: "Verify1234",
  });
  check("ADM-108 setup user registered", reg.status === 200);
  const copiedCookie = c.cookie;
  check("copied cookie works before logout (200)", (await c.get("/api/auth/me")).status === 200);
  await c.post("/api/auth/logout");
  const replay = new Client();
  replay.cookie = copiedCookie;
  check("ADM-108 copied cookie rejected after logout (401)", (await replay.get("/api/auth/me")).status === 401);

  // ADV-131: 12 login guesses with rotating spoofed X-Forwarded-For headers must hit 429
  const targetEmail = `verify.rl.${Date.now()}@demo.test`;
  let got429 = false;
  for (let i = 1; i <= 12; i++) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `203.0.113.${i}`,
      },
      body: JSON.stringify({ email: targetEmail, password: "WrongPassword1" }),
    });
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  check("ADV-131 spoofed X-Forwarded-For cannot bypass login rate limit (429)", got429);
}


const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withDb(fn) {
  const { connect } = await import("./_db.mjs");
  const db = connect();
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** Fresh live exam (window open now) enrolled for the given candidate clients. */
async function makeLiveExam(ex1, candidates, label, questionIds) {
  const now = Date.now();
  const ex = await ex1.post("/api/exams", {
    title: `Verify ${label} ${now}`,
    instructions: `${label} hardening test`,
    startsAt: new Date(now - 60_000).toISOString(),
    endsAt: new Date(now + 3600_000).toISOString(),
    durationMinutes: 15,
    shuffleQuestions: false,
    shuffleOptions: false,
    multiScoring: "PARTIAL",
    negativeMarking: 0,
    showAnswers: true,
    recoveryWindowSeconds: 120,
  });
  const examId = ex.data.id;
  await ex1.req("PUT", `/api/exams/${examId}/questions`, {
    items: questionIds.map((questionId) => ({ questionId, marks: 2 })),
  });
  const ids = [];
  for (const c of candidates) ids.push((await c.get("/api/auth/me")).data.id);
  await ex1.post(`/api/exams/${examId}/enrollments`, { candidateIds: ids });
  await ex1.post(`/api/exams/${examId}/publish`);
  return examId;
}

async function hardening() {
  console.log("H  hardening: judge scenarios");
  const ex1 = await login("examiner1@demo.test");
  const ex2 = await login("examiner2@demo.test");
  const admin = await login("admin@demo.test");
  const cand1 = await login("candidate1@demo.test");
  const cand2 = await login("candidate2@demo.test");
  const qs = (await ex1.get("/api/questions?pageSize=50")).data.items;
  const single = qs.find((q) => q.type === "MCQ_SINGLE");
  const written = qs.find((q) => q.type === "WRITTEN");

  // 1. Double-click Start and double-click Submit (concurrent requests).
  const e1 = await makeLiveExam(ex1, [cand1], "DoubleClick", [single.id, written.id]);
  const starts = await Promise.all(
    Array.from({ length: 5 }, () => cand1.post(`/api/exams/${e1}/start`)),
  );
  const attemptId = starts[0].data?.id;
  check(
    "double-click Start: 5 concurrent starts -> one attempt",
    starts.every((r) => r.status === 200 && r.data.id === attemptId),
  );
  check(
    "only one real attempt row exists",
    (await withDb((db) => db.query("SELECT count(*)::int n FROM attempts WHERE exam_id=$1", [e1]))).rows[0].n === 1,
  );
  const aq = starts[0].data.questions;
  const aqW = aq.find((q) => q.type === "WRITTEN");
  const aqS = aq.find((q) => q.type === "MCQ_SINGLE");

  // 2. Two tabs on one attempt: same session, independent seq counters.
  const tabB = new Client();
  tabB.cookie = cand1.cookie;
  const tabBStart = await tabB.post(`/api/exams/${e1}/start`);
  check("second tab resumes the same attempt", tabBStart.data?.id === attemptId);
  await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqS.id, selectedOptionIds: [aqS.options[0].id], seq: 5,
  });
  const staleTab = await tabB.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqS.id, selectedOptionIds: [aqS.options[1].id], seq: 3,
  });
  check("stale tab write is ignored, not applied", staleTab.status === 200 && staleTab.data.stale === true);
  const racing = await Promise.all([
    tabB.req("PUT", `/api/attempts/${attemptId}/answers`, {
      attemptQuestionId: aqS.id, selectedOptionIds: [aqS.options[1].id], seq: 12,
    }),
    cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
      attemptQuestionId: aqS.id, selectedOptionIds: [aqS.options[0].id], seq: 11,
    }),
  ]);
  const afterRace = (await cand1.get(`/api/attempts/${attemptId}`)).data.answers.find(
    (a) => a.attemptQuestionId === aqS.id,
  );
  check(
    "concurrent tab writes: highest seq wins regardless of arrival order",
    racing.every((r) => r.status === 200) && afterRace.seq === 12 && afterRace.selectedOptionIds[0] === aqS.options[1].id,
  );

  // 3. Script tags in answers: stored verbatim, returned as JSON text, never as HTML.
  const xss = `<script>alert("x")</script><img src=x onerror=alert(1)>`;
  await cand1.req("PUT", `/api/attempts/${attemptId}/answers`, {
    attemptQuestionId: aqW.id, textAnswer: xss, seq: 1,
  });
  const rawRes = await fetch(`${BASE}/api/attempts/${attemptId}`, { headers: { cookie: cand1.cookie } });
  const rawJson = await rawRes.json();
  check(
    "script-tag answer round-trips byte-for-byte (no lossy filtering)",
    rawJson.data.answers.find((a) => a.attemptQuestionId === aqW.id)?.textAnswer === xss,
  );
  check(
    "API serves JSON with nosniff (cannot be sniffed into HTML)",
    rawRes.headers.get("content-type")?.includes("application/json") &&
      rawRes.headers.get("x-content-type-options") === "nosniff",
  );
  const fs = await import("node:fs");
  const path = await import("node:path");
  const walk = (d) =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
  const unsafe = walk(path.join(process.cwd(), "src"))
    .filter((f) => /\.(tsx?|jsx?)$/.test(f))
    .filter((f) => /dangerouslySetInnerHTML|rehype-raw|\.innerHTML\s*=/.test(fs.readFileSync(f, "utf8")));
  check("no raw-HTML rendering paths in src (React escapes on render)", unsafe.length === 0, unsafe.join(", "));

  // 4. Double-click Submit.
  const subs = await Promise.all(
    Array.from({ length: 5 }, () => cand1.post(`/api/attempts/${attemptId}/submit`)),
  );
  check(
    "double-click Submit: 5 concurrent submits -> one submission, same receipt",
    subs.every(
      (r) =>
        r.status === 200 &&
        r.data.submittedAt === subs[0].data.submittedAt &&
        r.data.receiptCode === subs[0].data.receiptCode,
    ) && /^NP-[0-9A-F]{4}-[0-9A-F]{4}$/.test(subs[0].data.receiptCode ?? ""),
  );
  check("receipt reports answered count", subs[0].data.answeredCount === 2 && subs[0].data.totalQuestions === 2);

  // 5. Back button after submit: the attempt page shows the receipt; nothing is writable.
  const back = await cand1.get(`/api/attempts/${attemptId}`);
  check(
    "back button after submit: attempt is SUBMITTED with the same receipt",
    back.data.status === "SUBMITTED" && back.data.receiptCode === subs[0].data.receiptCode,
  );
  check("back button: re-start is refused (409)", (await cand1.post(`/api/exams/${e1}/start`)).status === 409);
  check(
    "back button: stale tab autosave refused (409 ATTEMPT_CLOSED)",
    (await tabB.req("PUT", `/api/attempts/${attemptId}/answers`, {
      attemptQuestionId: aqS.id, selectedOptionIds: [aqS.options[0].id], seq: 99,
    })).error?.code === "ATTEMPT_CLOSED",
  );
  const lateSync = await tabB.post(`/api/attempts/${attemptId}/sync`, {
    items: [{ attemptQuestionId: aqS.id, selectedOptionIds: [aqS.options[0].id], seq: 100, capturedElapsedMs: 1000 }],
  });
  check("back button: offline queue replay refused after submit", lateSync.data?.rejected === 1);

  // 6. Opening another candidate's attempt URL.
  const other = [
    ["GET attempt", () => cand2.get(`/api/attempts/${attemptId}`)],
    ["PUT answer", () => cand2.req("PUT", `/api/attempts/${attemptId}/answers`, { attemptQuestionId: aqS.id, selectedOptionIds: [], seq: 500 })],
    ["POST submit", () => cand2.post(`/api/attempts/${attemptId}/submit`)],
    ["POST sync", () => cand2.post(`/api/attempts/${attemptId}/sync`, { items: [{ attemptQuestionId: aqS.id, selectedOptionIds: [], seq: 500, capturedElapsedMs: 1000 }] })],
    ["PUT scratchpad", () => cand2.req("PUT", `/api/attempts/${attemptId}/scratchpad`, { scratchpad: "x" })],
    ["POST heartbeat", () => cand2.post(`/api/attempts/${attemptId}/heartbeat`)],
    ["GET result", () => cand2.get(`/api/attempts/${attemptId}/result`)],
    ["GET report.pdf", () => cand2.get(`/api/attempts/${attemptId}/report.pdf`)],
    ["examiner1 GET as candidate", () => ex1.get(`/api/attempts/${attemptId}`)],
    ["examiner2 grades it", () => ex2.req("PUT", `/api/attempts/${attemptId}/grade/${aqW.id}`, { score: 1 })],
    ["examiner2 opens exam grading", () => ex2.get(`/api/exams/${e1}/grading`)],
    ["examiner2 exports results", () => ex2.get(`/api/exams/${e1}/results.csv`)],
  ];
  const leaks = [];
  for (const [name, fn] of other) {
    const r = await fn();
    if (![401, 403, 404].includes(r.status)) leaks.push(`${name}=${r.status}`);
  }
  check("another user's attempt URL: every endpoint is 403/404", leaks.length === 0, leaks.join(" "));
  const stillMine = await cand1.get(`/api/attempts/${attemptId}`);
  check("foreign requests changed nothing", stillMine.data.receiptCode === subs[0].data.receiptCode && stillMine.data.scratchpad === "");

  // 7. Refresh exactly at the deadline (server clock decides; submitted_at = deadline).
  const e2 = await makeLiveExam(ex1, [cand1], "Deadline", [single.id]);
  const st = await cand1.post(`/api/exams/${e2}/start`);
  const dAttempt = st.data.id;
  const dq = st.data.questions[0];
  await withDb((db) =>
    db.query("UPDATE attempts SET deadline_at = now() + interval '1500 milliseconds' WHERE id = $1", [dAttempt]),
  );
  const beforeDl = await cand1.req("PUT", `/api/attempts/${dAttempt}/answers`, {
    attemptQuestionId: dq.id, selectedOptionIds: [dq.options[0].id], seq: 1,
  });
  check("answer saved just before deadline accepted", beforeDl.data?.accepted === true);
  await sleep(1700);
  const refresh = await cand1.get(`/api/attempts/${dAttempt}`);
  check(
    "refresh at deadline: auto-submitted as TIMEOUT, submittedAt == deadlineAt",
    refresh.data.status === "SUBMITTED" &&
      refresh.data.submitReason === "TIMEOUT" &&
      refresh.data.submittedAt === refresh.data.deadlineAt,
  );
  check(
    "refresh at deadline: saved answer kept and receipt issued",
    refresh.data.answers.find((a) => a.attemptQuestionId === dq.id)?.selectedOptionIds[0] === dq.options[0].id &&
      !!refresh.data.receiptCode,
  );
  check(
    "answer after deadline refused (409)",
    (await cand1.req("PUT", `/api/attempts/${dAttempt}/answers`, {
      attemptQuestionId: dq.id, selectedOptionIds: [dq.options[1].id], seq: 2,
    })).status === 409,
  );
  const lateSubmit = await cand1.post(`/api/attempts/${dAttempt}/submit`);
  check("submit after deadline stays TIMEOUT (not USER)", lateSubmit.data?.submitReason === "TIMEOUT");

  // 8. Changing the device clock: the server never trusts client time.
  const e3 = await makeLiveExam(ex1, [cand1], "Clock", [single.id]);
  const c3 = await cand1.post(`/api/exams/${e3}/start`);
  const skew = Math.abs(Date.parse(c3.data.serverNow) - Date.now());
  check("timer anchored to server time (serverNow returned)", !!c3.data.serverNow && skew < 30_000);
  check(
    "deadline = server start + duration (not client time)",
    Date.parse(c3.data.deadlineAt) - Date.parse(c3.data.startedAt) === 15 * 60_000,
  );
  const forged = await cand1.req("PUT", `/api/attempts/${c3.data.id}/answers`, {
    attemptQuestionId: c3.data.questions[0].id,
    selectedOptionIds: [c3.data.questions[0].options[0].id],
    seq: 1,
    savedAt: "2099-01-01T00:00:00.000Z",
    clientNow: "2099-01-01T00:00:00.000Z",
  });
  const fRow = (await cand1.get(`/api/attempts/${c3.data.id}`)).data.answers[0];
  check(
    "client-sent timestamps ignored (savedAt is server time)",
    forged.status === 200 && Math.abs(Date.parse(fRow.savedAt) - Date.now()) < 60_000,
  );
  // Clock set back an hour then offline answers replayed after the deadline: elapsed claims are bounded.
  await withDb((db) =>
    db.query("UPDATE attempts SET started_at = now() - interval '905 seconds', deadline_at = now() - interval '5 seconds' WHERE id = $1", [c3.data.id]),
  );
  const fakeClock = await cand1.post(`/api/attempts/${c3.data.id}/sync`, {
    items: [{ attemptQuestionId: c3.data.questions[0].id, selectedOptionIds: [c3.data.questions[0].options[1].id], seq: 2, capturedElapsedMs: 3_600_000 }],
  });
  check(
    "device clock tricks cannot buy extra time (late sync rejected)",
    fakeClock.data?.rejected === 1 && fakeClock.data.results[0].status === "REJECTED",
  );

  // 9. CSV formula injection on import and export.
  const inj = await ex1.post(`/api/exams/${e1}/candidates/import/validate`, {
    content: ["name,email", `=HYPERLINK("http://evil.test","click"),verify.inj.${Date.now()}@demo.test`, `@SUM(1+1),verify.inj2.${Date.now()}@demo.test`].join("\n"),
  });
  check(
    "candidate import rejects formula-leading names (row + field reported)",
    inj.status === 200 && inj.data.valid === 0 && inj.data.rows.every((r) => r.errors.some((e) => e.field === "name")),
  );
  const qInj = await ex1.post("/api/questions/import/validate", {
    format: "csv",
    content: "topic,difficulty,type,body,marks,options,correct\n=cmd|' /C calc'!A0,EASY,WRITTEN,Formula topic question,1,,",
  });
  check("question import rejects formula-leading topic", qInj.status === 200 && qInj.data.valid === 0 && qInj.data.rows[0].errors.some((e) => e.field === "topic"));
  check(
    "registration rejects formula-leading name (400)",
    (await new Client().post("/api/auth/register", { name: "=1+1", email: `verify.f.${Date.now()}@demo.test`, password: "Verify1234" })).status === 400,
  );
  // Data that bypassed validation (legacy row) must still be neutralised on export.
  const evilEmail = `verify.evil.${Date.now()}@demo.test`;
  const evil = await new Client().post("/api/auth/register", { name: "Evil Person", email: evilEmail, password: "Verify1234" });
  await withDb((db) => db.query(`UPDATE users SET name = '=HYPERLINK("http://evil.test","x")' WHERE id = $1`, [evil.data.id]));
  await ex1.post(`/api/exams/${e1}/enrollments`, { candidateIds: [evil.data.id] });
  const csvRes = await fetch(`${BASE}/api/exams/${e1}/results.csv`, { headers: { cookie: ex1.cookie } });
  const csvText = await csvRes.text();
  const evilLine = csvText.split("\r\n").find((l) => l.includes(evilEmail)) ?? "";
  check(
    "results CSV export neutralises formulas (prefixed with ')",
    csvRes.status === 200 &&
      csvRes.headers.get("content-type")?.includes("text/csv") &&
      evilLine.startsWith(`"'=HYPERLINK(`) &&
      !/(^|,)=/.test(evilLine),
    evilLine,
  );
  check("results CSV includes the submission receipt code", csvText.includes(subs[0].data.receiptCode));
  check("admin can export results read-only", (await admin.get(`/api/exams/${e1}/results.csv`)).status !== 403);

  return { examId: e1, attemptId, aqWrittenId: aqW.id, receiptCode: subs[0].data.receiptCode };
}

async function featureSlice(h) {
  console.log("F  system check, clone, grade-by-question, audit log");
  const ex1 = await login("examiner1@demo.test");
  const ex2 = await login("examiner2@demo.test");
  const admin = await login("admin@demo.test");
  const cand1 = await login("candidate1@demo.test");

  // Pre-exam system check endpoint (autosave round-trip).
  const sc = await cand1.post("/api/system-check", { nonce: "abcdef123456", payload: "x".repeat(4000) });
  check("system check: autosave echo round-trips", sc.status === 200 && sc.data.nonce === "abcdef123456" && sc.data.receivedBytes === 4000);
  check("system check requires login (401)", (await new Client().post("/api/system-check", { nonce: "abcdef123456", payload: "" })).status === 401);
  const my = (await cand1.get("/api/my/exams")).data.find((e) => e.examId === h.examId);
  check("candidate home shows the receipt code", my?.receiptCode === h.receiptCode);

  // Grade-by-question data: the same bank question id across candidates.
  const g = await ex1.get(`/api/exams/${h.examId}/grading`);
  const wItem = g.data.attempts.flatMap((a) => a.answers).find((x) => x.type === "WRITTEN");
  check("grading items expose questionId for grade-by-question", !!wItem?.questionId);

  // Grade, regrade, publish -> audit entries.
  await ex1.req("PUT", `/api/attempts/${h.attemptId}/grade/${h.aqWrittenId}`, { score: 1 });
  await ex1.req("PUT", `/api/attempts/${h.attemptId}/grade/${h.aqWrittenId}`, { score: 1.5 });
  await ex1.post(`/api/exams/${h.examId}/results/publish`);
  const auditExam = await ex1.get(`/api/exams/${h.examId}/audit?pageSize=50`);
  const actions = auditExam.data?.items.map((i) => i.action) ?? [];
  check(
    "audit: publish, grade and regrade recorded with actor",
    actions.includes("EXAM_PUBLISHED") && actions.includes("RESULTS_PUBLISHED") &&
      actions.filter((a) => a === "GRADE_CHANGED").length >= 2 &&
      auditExam.data.items.every((i) => i.actorName),
  );
  const regrade = auditExam.data.items.find((i) => i.action === "GRADE_CHANGED" && i.details.from === 1);
  check("audit: regrade keeps old and new score", regrade?.details.to === 1.5);
  check("audit: other examiner cannot read it (404)", (await ex2.get(`/api/exams/${h.examId}/audit`)).status === 404);
  check("audit: candidate cannot read it (403)", (await cand1.get(`/api/exams/${h.examId}/audit`)).status === 403);
  check("audit: admin sees exam audit", (await admin.get(`/api/exams/${h.examId}/audit`)).status === 200);

  // Extra time + role change are audited.
  const e = await makeLiveExam(ex1, [cand1], "AuditExt", [(await ex1.get("/api/questions?pageSize=5")).data.items[0].id]);
  const at = await cand1.post(`/api/exams/${e}/start`);
  await ex1.post(`/api/attempts/${at.data.id}/extensions`, { minutes: 5, reason: "Fire alarm in hall" });
  const extA = await ex1.get(`/api/exams/${e}/audit?action=TIME_EXTENSION_GRANTED`);
  check("audit: extra time recorded with reason", extA.data?.items[0]?.details.reason === "Fire alarm in hall");
  await cand1.post(`/api/attempts/${at.data.id}/submit`);

  const u = await admin.post("/api/admin/users", { name: "Audit Target", email: `verify.audit.${Date.now()}@demo.test`, role: "CANDIDATE" });
  await admin.patch(`/api/admin/users/${u.data.user.id}`, { role: "EXAMINER" });
  const roleA = await admin.get("/api/admin/audit?action=ROLE_CHANGED&pageSize=5");
  check(
    "audit: role change recorded (from -> to)",
    roleA.data?.items[0]?.targetId === u.data.user.id && roleA.data.items[0].details.from === "CANDIDATE" && roleA.data.items[0].details.to === "EXAMINER",
  );
  check("audit: admin-wide log is admin-only (403)", (await ex1.get("/api/admin/audit")).status === 403);
  const tamper = await withDb((db) => db.query("UPDATE audit_log SET summary = 'x' WHERE id = (SELECT max(id) FROM audit_log)").then(() => "updated", (err) => err.message));
  check("audit log is append-only at the DB level", /append-only/.test(tamper));

  // Exam clone.
  const cl = await ex1.post(`/api/exams/${h.examId}/clone`);
  check(
    "clone: new DRAFT with same questions, no enrollments, future window",
    cl.status === 200 && cl.data.status === "DRAFT" && cl.data.id !== h.examId &&
      cl.data.questionCount === 2 && cl.data.enrollmentCount === 0 &&
      Date.parse(cl.data.startsAt) > Date.now() && cl.data.title.endsWith("(copy)"),
  );
  check("clone: other examiner cannot clone (404)", (await ex2.post(`/api/exams/${h.examId}/clone`)).status === 404);
  check("clone: audited", (await ex1.get(`/api/exams/${cl.data.id}/audit`)).data?.items[0]?.action === "EXAM_CLONED");
  check("clone is immediately publishable", (await ex1.post(`/api/exams/${cl.data.id}/publish`)).status === 200);

  // Question bank filters + preview.
  const t = (await ex1.get("/api/topics")).data[0];
  const f = await ex1.get(`/api/questions?topicId=${t.id}&difficulty=EASY&type=MCQ_SINGLE&pageSize=50`);
  check(
    "question filters combine topic + difficulty + type",
    f.status === 200 && f.data.items.every((q) => q.topicId === t.id && q.difficulty === "EASY" && q.type === "MCQ_SINGLE"),
  );
  const pv = await ex1.get(`/api/questions/${f.data.items[0]?.id ?? (await ex1.get("/api/questions")).data.items[0].id}`);
  check("question preview returns options with answer key (owner only)", pv.status === 200 && pv.data.options.some((o) => o.isCorrect));
}

try {
  await slice0();
  await slice1();
  await slice2();
  const s3 = await slice3();
  await slice4(s3);
  await slice5();
  await slice6(s3);
  await slice7();
  await securityRegression();
  const h = await hardening();
  await featureSlice(h);
} catch (e) {
  failed++;
  console.log("  FAIL (exception)", e.message);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
