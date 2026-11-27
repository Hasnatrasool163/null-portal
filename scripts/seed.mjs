// Demo data. Idempotent: re-running does not duplicate users.
import bcrypt from "bcryptjs";
import { connect } from "./_db.mjs";

const USERS = [
  { name: "Admin", email: "admin@demo.test", role: "ADMIN" },
  { name: "Demo User", email: "user@demo.test", role: "USER" },
];
const PASSWORD = "Demo1234";

const client = connect();
await client.connect();
try {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const ids = {};
  for (const u of USERS) {
    const r = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT ((lower(email))) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
       RETURNING id`,
      [u.name, u.email, hash, u.role],
    );
    ids[u.email] = r.rows[0].id;
  }
  const { rows } = await client.query("SELECT count(*)::int AS n FROM items");
  if (rows[0].n === 0) {
    const demo = ids["user@demo.test"];
    const items = [
      [
        "Plan the project",
        "Write requirements and assumptions",
        "done",
        2,
        "2026-11-27",
      ],
      [
        "Design the database",
        "ERD and migrations",
        "in_progress",
        1,
        "2026-11-27",
      ],
      [
        "Build the API",
        "Validated endpoints with consistent errors",
        "todo",
        1,
        "2026-11-28",
      ],
      [
        "Polish the UI",
        "Responsive layout, empty and loading states",
        "todo",
        3,
        null,
      ],
    ];
    for (const [t, d, s, p, due] of items) {
      await client.query(
        "INSERT INTO items (owner_id, title, description, status, priority, due_date) VALUES ($1,$2,$3,$4,$5,$6)",
        [demo, t, d, s, p, due],
      );
    }
  }
  console.log(
    `seeded. Demo logins: ${USERS.map((u) => u.email).join(", ")} / ${PASSWORD}`,
  );
} finally {
  await client.end();
}
