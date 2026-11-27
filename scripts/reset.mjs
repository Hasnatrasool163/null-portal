// DANGER: drops everything in the public schema, then re-run migrate + seed.
import { connect } from "./_db.mjs";

const client = connect();
await client.connect();
try {
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  console.log("schema dropped. Run: npm run db:migrate && npm run db:seed");
} finally {
  await client.end();
}
