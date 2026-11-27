// Restores the live demo exams (fresh windows relative to NOW and clean attempts)
// while keeping the completed Mathematics Diagnostic exam and its 8 graded attempts intact.
import { connect } from "./_db.mjs";

const client = connect();
await client.connect();
try {
  const now = Date.now();
  const hr = 60 * 60 * 1000;
  const day = 24 * hr;

  const liveTitles = [
    "Computer Science Assessment (Live)",
    "Timer Demo (3 Minutes)",
  ];
  const { rows: liveExams } = await client.query(
    "SELECT id, title FROM exams WHERE title = ANY($1::text[])",
    [liveTitles],
  );

  for (const ex of liveExams) {
    await client.query("DELETE FROM attempts WHERE exam_id = $1", [ex.id]);
    await client.query("DELETE FROM announcements WHERE exam_id = $1", [ex.id]);
    await client.query(
      `UPDATE exams
       SET status = 'PUBLISHED',
           starts_at = $2,
           ends_at = $3,
           results_published_at = NULL,
           updated_at = now()
       WHERE id = $1`,
      [
        ex.id,
        new Date(now - 1 * hr).toISOString(),
        new Date(now + 7 * day).toISOString(),
      ],
    );
  }

  // Also refresh the Upcoming exam window so it stays in the future.
  await client.query(
    `UPDATE exams
     SET status = 'PUBLISHED',
         starts_at = $1,
         ends_at = $2,
         updated_at = now()
     WHERE title = 'General Science Quiz (Upcoming)'`,
    [
      new Date(now + 24 * hr).toISOString(),
      new Date(now + 4 * day).toISOString(),
    ],
  );

  // Remove temporary verify.* exams & users created by npm run verify.
  await client.query("DELETE FROM exams WHERE title LIKE 'Verify %'");
  await client.query("DELETE FROM users WHERE email LIKE 'verify.%@demo.test'");

  console.log(
    `reset ${liveExams.length} live demo exam(s) and cleaned up verification test records.`,
  );
} finally {
  await client.end();
}
