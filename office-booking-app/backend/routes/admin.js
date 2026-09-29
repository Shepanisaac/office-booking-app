const express = require("express");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { createDesk } = require("../models/deskModel");
const { listAll } = require("../models/bookingModel");

const router = express.Router();
router.use(requireAuth, requireAdmin);

// POST /admin/desks
router.post("/desks", async (req, res) => {
  const { label, floor, zone } = req.body;
  if (!label || floor === undefined) {
    return res.status(400).json({ error: "bad_request", message: "label and floor are required" });
  }
  const desk = await createDesk({ label, floor, zone });
  res.status(201).json(desk);
});

// GET /admin/bookings?date=&status=
router.get("/bookings", async (req, res) => {
  const bookings = await listAll({ date: req.query.date, status: req.query.status });
  res.json(bookings);
});

module.exports = router;
