const express = require("express");
const { requireAuth } = require("../middleware/auth");
const bookingModel = require("../models/bookingModel");

const router = express.Router();
router.use(requireAuth);

// POST /bookings — relies on the DB unique constraint for the double-booking guard.
// See models/bookingModel.js and Office_Booking_App_Database_Schema.docx §3.1.
router.post("/", async (req, res) => {
  const { desk_id, booking_date, timeslot } = req.body;
  if (!desk_id || !booking_date || !timeslot) {
    return res.status(400).json({ error: "bad_request", message: "desk_id, booking_date, timeslot are required" });
  }

  try {
    const booking = await bookingModel.createBooking({
      userId: req.user.sub,
      deskId: desk_id,
      bookingDate: booking_date,
      timeslot,
    });
    res.status(201).json(booking);
  } catch (err) {
    if (err.code === "23505") {
      if (err.constraint === "unique_user_date") {
        // This user already holds an active booking that day — one desk
        // per person per day, regardless of which desk or timeslot.
        return res.status(409).json({
          error: "conflict",
          message: "You already have a desk booked for that date. Cancel it first, or book FULL_DAY instead of separate slots.",
        });
      }
      // unique_desk_slot violation — someone else booked this desk first
      return res.status(409).json({ error: "conflict", message: "Desk no longer available for that date/timeslot" });
    }
    throw err;
  }
});

// GET /bookings?status=
router.get("/", async (req, res) => {
  const bookings = await bookingModel.listForUser(req.user.sub, req.query.status);
  res.json(bookings);
});

// DELETE /bookings/:id
router.delete("/:id", async (req, res) => {
  const booking = await bookingModel.cancel(req.params.id, req.user.sub);
  if (!booking) {
    return res.status(404).json({ error: "not_found", message: "Booking not found" });
  }
  res.json(booking);
});

// POST /bookings/:id/check-in
router.post("/:id/check-in", async (req, res) => {
  const booking = await bookingModel.checkIn(req.params.id, req.user.sub);
  if (!booking) {
    // Either it doesn't exist, or it was already auto-released for a no-show
    const existing = await bookingModel.findById(req.params.id);
    if (existing && existing.status === "released") {
      return res.status(410).json({ error: "gone", message: "Booking already auto-released due to no-show" });
    }
    return res.status(404).json({ error: "not_found", message: "Booking not found" });
  }
  res.json(booking);
});

module.exports = router;
