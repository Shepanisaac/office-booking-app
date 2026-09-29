const pool = require("../db/pool");

async function listDesks({ floor, zone } = {}) {
  const conditions = ["is_active = true"];
  const params = [];

  if (floor) {
    params.push(floor);
    conditions.push(`floor = $${params.length}`);
  }
  if (zone) {
    params.push(zone);
    conditions.push(`zone = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT * FROM desks WHERE ${conditions.join(" AND ")} ORDER BY floor, label`,
    params
  );
  return rows;
}

// Supports "view available desks for tomorrow" (see API_Reference.md → /desks/availability)
async function listWithAvailability({ date, timeslot }) {
  const { rows } = await pool.query(
    `SELECT d.*,
            NOT EXISTS (
              SELECT 1 FROM bookings b
              WHERE b.desk_id = d.id
                AND b.booking_date = $1
                AND b.timeslot = $2
                AND b.status IN ('confirmed', 'checked_in')
            ) AS available
     FROM desks d
     WHERE d.is_active = true
     ORDER BY d.floor, d.label`,
    [date, timeslot]
  );
  return rows;
}

async function createDesk({ label, floor, zone }) {
  const { rows } = await pool.query(
    `INSERT INTO desks (label, floor, zone) VALUES ($1, $2, $3) RETURNING *`,
    [label, floor, zone]
  );
  return rows[0];
}

module.exports = { listDesks, listWithAvailability, createDesk };
