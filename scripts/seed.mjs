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

  // ---- Question bank (only seeded when the examiner has no questions yet) ----
  const S = "MCQ_SINGLE",
    M = "MCQ_MULTI",
    W = "WRITTEN";
  // [type, difficulty, marks, body, options, correctIndexes]
  const BANK = {
    "examiner1@demo.test": {
      "Computer Science Fundamentals": [
        [S, "EASY", 1, "Which data structure operates on a last-in, first-out basis?", ["Queue", "Stack", "Array", "Heap"], [1]],
        [S, "EASY", 1, "What does CPU stand for?", ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Control Processing Unit"], [0]],
        [S, "MEDIUM", 2, "What is the worst-case time complexity of binary search on a sorted array of n items?", ["O(n)", "O(log n)", "O(n log n)", "O(1)"], [1]],
        [S, "MEDIUM", 2, "Which protocol is used to load web pages securely?", ["FTP", "SMTP", "HTTPS", "SSH"], [2]],
        [S, "HARD", 3, "Which sorting algorithm has the best worst-case time complexity among these?", ["Quick sort", "Bubble sort", "Merge sort", "Insertion sort"], [2]],
        [M, "MEDIUM", 2, "Select all of the following that are relational databases.", ["PostgreSQL", "MongoDB", "MySQL", "Redis"], [0, 2]],
        [M, "HARD", 3, "Which of these statements about TCP are true?", ["It is connection-oriented", "It guarantees ordered delivery", "It is faster than UDP in all cases", "It uses retransmission for lost segments"], [0, 1, 3]],
        [M, "EASY", 2, "Select the programming languages that are compiled to machine code by default.", ["C", "Python", "Rust", "JavaScript"], [0, 2]],
        [W, "MEDIUM", 5, "Explain the difference between a process and a thread.", [], []],
        [W, "HARD", 8, "Describe how a hash table handles collisions and the trade-offs of each approach.", [], []],
      ],
      "General Science": [
        [S, "EASY", 1, "What is the chemical symbol for water?", ["H2O", "CO2", "O2", "NaCl"], [0]],
        [S, "EASY", 1, "Which planet is known as the Red Planet?", ["Venus", "Mars", "Jupiter", "Mercury"], [1]],
        [S, "MEDIUM", 2, "What is the SI unit of force?", ["Joule", "Pascal", "Newton", "Watt"], [2]],
        [S, "MEDIUM", 2, "Which gas do plants absorb during photosynthesis?", ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], [2]],
        [S, "HARD", 3, "Which law states that the pressure of a gas is inversely proportional to its volume at constant temperature?", ["Charles's law", "Boyle's law", "Avogadro's law", "Gay-Lussac's law"], [1]],
        [M, "MEDIUM", 2, "Select all of the following that are noble gases.", ["Helium", "Neon", "Nitrogen", "Argon"], [0, 1, 3]],
        [M, "HARD", 3, "Which of these are vector quantities?", ["Velocity", "Speed", "Displacement", "Mass"], [0, 2]],
        [M, "EASY", 2, "Select the states of matter.", ["Solid", "Liquid", "Gas", "Energy"], [0, 1, 2]],
        [W, "MEDIUM", 5, "Describe the water cycle and name its main stages.", [], []],
        [W, "HARD", 8, "Explain how natural selection leads to adaptation in a population.", [], []],
      ],
      Mathematics: [
        [S, "EASY", 1, "What is 12 x 12?", ["124", "144", "132", "148"], [1]],
        [S, "EASY", 1, "What is the value of 5! (five factorial)?", ["60", "100", "120", "24"], [2]],
        [S, "MEDIUM", 2, "What is the derivative of x squared?", ["x", "2x", "x squared", "2"], [1]],
        [S, "MEDIUM", 2, "What is the sum of the interior angles of a triangle?", ["90 degrees", "180 degrees", "270 degrees", "360 degrees"], [1]],
        [S, "HARD", 3, "What is the antiderivative of 1/x for x > 0?", ["x", "ln(x) + C", "1/x squared + C", "e^x + C"], [1]],
        [M, "MEDIUM", 2, "Select all prime numbers.", ["2", "9", "11", "15"], [0, 2]],
        [M, "HARD", 3, "Which of these functions are even functions?", ["x squared", "cos(x)", "x cubed", "|x|"], [0, 1, 3]],
        [M, "EASY", 2, "Select all even numbers.", ["14", "21", "38", "45"], [0, 2]],
        [W, "MEDIUM", 5, "Prove that the square root of 2 is irrational.", [], []],
        [W, "HARD", 8, "Explain the difference between permutations and combinations with one example of each.", [], []],
      ],
    },
    "examiner2@demo.test": {
      Networking: [
        [S, "EASY", 1, "Which layer of the OSI model is responsible for routing packets?", ["Physical", "Network", "Session", "Application"], [1]],
        [S, "MEDIUM", 2, "Which port does HTTPS use by default?", ["80", "21", "443", "25"], [2]],
        [M, "MEDIUM", 2, "Select all protocols that operate at the transport layer.", ["TCP", "IP", "UDP", "HTTP"], [0, 2]],
        [W, "MEDIUM", 5, "Explain how DNS resolves a domain name to an IP address.", [], []],
      ],
    },
  };
  for (const [email, topics] of Object.entries(BANK)) {
    const owner = (
      await client.query("SELECT id FROM users WHERE lower(email) = $1", [email])
    ).rows[0].id;
    const have = await client.query(
      "SELECT count(*)::int AS n FROM questions WHERE owner_id = $1",
      [owner],
    );
    if (have.rows[0].n > 0) continue;
    for (const [topicName, qs] of Object.entries(topics)) {
      const t = await client.query(
        `INSERT INTO topics (owner_id, name) VALUES ($1,$2)
         ON CONFLICT (owner_id, (lower(name))) DO UPDATE SET name = topics.name RETURNING id`,
        [owner, topicName],
      );
      for (const [type, diff, marks, body, options, correct] of qs) {
        const q = await client.query(
          `INSERT INTO questions (owner_id, topic_id, type, difficulty, body, default_marks)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [owner, t.rows[0].id, type, diff, body, marks],
        );
        for (const [i, text] of options.entries()) {
          await client.query(
            "INSERT INTO question_options (question_id, body, is_correct, position) VALUES ($1,$2,$3,$4)",
            [q.rows[0].id, text, correct.includes(i), i],
          );
        }
      }
    }
    console.log(`seeded question bank for ${email}`);
  }
} finally {
  await client.end();
}
