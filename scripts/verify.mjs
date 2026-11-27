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

try {
  await slice0();
  await slice1();
} catch (e) {
  failed++;
  console.log("  FAIL (exception)", e.message);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
