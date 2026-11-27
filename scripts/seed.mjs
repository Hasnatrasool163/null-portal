// Demo data. Idempotent: re-running does not duplicate users.
// Later slices extend this file (topics, questions, exams, attempts).
import bcrypt from "bcryptjs";
import { connect } from "./_db.mjs";

export const PASSWORD = "Demo1234";
export const USERS = [
  { name: "Ada Admin", email: "admin@demo.test", role: "ADMIN" },
  { name: "Elena Examiner", email: "examiner1@demo.test", role: "EXAMINER" },
  { name: "Omar Examiner", email: "examiner2@demo.test", role: "EXAMINER" },
  ...[
    "Aisha Khan",
    "Bilal Ahmed",
    "Chaman Lal",
    "Dua Fatima",
    "Eman Tariq",
    "Farhan Ali",
    "Gul Rukh",
    "Hamza Iqbal",
  ].map((name, i) => ({
    name,
    email: `candidate${i + 1}@demo.test`,
    role: "CANDIDATE",
  })),
];

const client = connect();
await client.connect();
try {
  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const u of USERS) {
    await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT ((lower(email))) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, is_active = true`,
      [u.name, u.email, hash, u.role],
    );
  }
  console.log(`seeded ${USERS.length} users. Password for all: ${PASSWORD}`);
} finally {
  await client.end();
}
