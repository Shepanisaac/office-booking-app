// Minimal seed data so the test suite and concurrency stress test have
// a desk to book against. Safe to run multiple times (idempotent on desks
// via a simple existence check).

require("dotenv").config();
const pool = require("../db/pool");

async function run() {
  const { rows } = await pool.query(`SELECT id FROM desks LIMIT 1`);
  if (rows.length > 0) {
    console.log("Desks already seeded, skipping.");
  } else {
    await pool.query(
      `INSERT INTO desks (label, floor, zone) VALUES
       ('A11', 3, 'Quiet Zone'),
       ('A12', 3, 'Quiet Zone'),
       ('B04', 2, 'Collaboration Area')`
    );
    console.log("Seeded 3 desks.");
  }
  await pool.end();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
