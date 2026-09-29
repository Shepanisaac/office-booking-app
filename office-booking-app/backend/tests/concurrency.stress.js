// Concurrency stress test — the scenario named explicitly in the SDLC plan's
// Phase 5 ("Stress-test concurrency constraints: handling identical
// timestamp booking attempts for the same asset").
//
// This fires N simultaneous createBooking calls for the SAME desk/date/
// timeslot and asserts that exactly one succeeds and the rest fail with a
// 23505 unique-violation — proving the DB constraint (not app code) is what
// prevents the double-booking, as designed in
// docs/Office_Booking_App_Database_Schema.docx §3.1.
//
// Requires a running Postgres instance with the schema applied, and at
// least one seeded user + desk (see setup below). Run with:
//   npm run test:concurrency

require("dotenv").config();
const pool = require("../db/pool");
const bookingModel = require("../models/bookingModel");

const CONCURRENT_ATTEMPTS = 10;

async function getSeedIds() {
  const { rows: users } = await pool.query(`SELECT id FROM users LIMIT 1`);
  const { rows: desks } = await pool.query(`SELECT id FROM desks LIMIT 1`);

  if (!users[0] || !desks[0]) {
    throw new Error(
      "No seed user/desk found. Insert at least one row into users and desks before running this test."
    );
  }
  return { userId: users[0].id, deskId: desks[0].id };
}

async function cleanupPriorAttempt(deskId, date, timeslot) {
  await pool.query(
    `DELETE FROM bookings WHERE desk_id = $1 AND booking_date = $2 AND timeslot = $3`,
    [deskId, date, timeslot]
  );
}

async function run() {
  const { userId, deskId } = await getSeedIds();
  const bookingDate = "2099-01-01"; // far-future date, unlikely to collide with real data
  const timeslot = "AM";

  await cleanupPriorAttempt(deskId, bookingDate, timeslot);

  console.log(`Firing ${CONCURRENT_ATTEMPTS} simultaneous booking attempts for the same desk/date/timeslot...`);

  const attempts = Array.from({ length: CONCURRENT_ATTEMPTS }, () =>
    bookingModel
      .createBooking({ userId, deskId, bookingDate, timeslot })
      .then(() => ({ status: "fulfilled" }))
      .catch((err) => ({ status: "rejected", code: err.code }))
  );

  const results = await Promise.all(attempts);

  const succeeded = results.filter((r) => r.status === "fulfilled");
  const rejectedByConstraint = results.filter((r) => r.status === "rejected" && r.code === "23505");
  const rejectedOther = results.filter((r) => r.status === "rejected" && r.code !== "23505");

  console.log(`  Succeeded:                 ${succeeded.length}`);
  console.log(`  Rejected (unique_violation): ${rejectedByConstraint.length}`);
  console.log(`  Rejected (other error):      ${rejectedOther.length}`);

  await cleanupPriorAttempt(deskId, bookingDate, timeslot);
  await pool.end();

  if (succeeded.length !== 1) {
    console.error(`FAIL: expected exactly 1 successful booking, got ${succeeded.length}`);
    process.exit(1);
  }
  if (rejectedByConstraint.length !== CONCURRENT_ATTEMPTS - 1) {
    console.error(
      `FAIL: expected ${CONCURRENT_ATTEMPTS - 1} unique-constraint rejections, got ${rejectedByConstraint.length}`
    );
    process.exit(1);
  }
  if (rejectedOther.length > 0) {
    console.error("FAIL: some attempts failed for a reason other than the unique constraint:", rejectedOther);
    process.exit(1);
  }

  console.log("PASS: exactly one booking succeeded; all others were correctly blocked by the DB constraint.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Concurrency test crashed:", err);
  process.exit(1);
});
