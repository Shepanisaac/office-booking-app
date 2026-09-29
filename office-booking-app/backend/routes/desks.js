const express = require("express");
const { listDesks, listWithAvailability } = require("../models/deskModel");

const router = express.Router();

// GET /desks?floor=&zone=
router.get("/", async (req, res) => {
  const { floor, zone } = req.query;
  const desks = await listDesks({ floor, zone });
  res.json(desks);
});

// GET /desks/availability?date=&timeslot=
router.get("/availability", async (req, res) => {
  const { date, timeslot } = req.query;
  if (!date || !timeslot) {
    return res.status(400).json({ error: "bad_request", message: "date and timeslot are required" });
  }

  const rows = await listWithAvailability({ date, timeslot });
  res.json(
    rows.map((r) => ({
      desk: { id: r.id, label: r.label, floor: r.floor, zone: r.zone, is_active: r.is_active },
      available: r.available,
    }))
  );
});

module.exports = router;
