// Run this on a schedule (cron, a serverless scheduled function, etc.) — e.g.
// every 5 minutes. It flips 'confirmed' bookings with no check-in past the
// 15-minute grace window to 'released', freeing the desk for others.
//
// See: Office_Booking_App_Database_Schema.docx §3.2, API_Reference.md (check-in).

require("dotenv").config();
const bookingModel = require("../models/bookingModel");

async function run() {
  const released = await bookingModel.releaseNoShows(15);
  console.log(`Released ${released.length} no-show booking(s):`, released.map((r) => r.id));
  process.exit(0);
}

run().catch((err) => {
  console.error("releaseNoShows job failed:", err);
  process.exit(1);
});
