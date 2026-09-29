const pool = require("../db/pool");

// Relies on the unique_desk_slot DB constraint (db/schema.sql) rather than an
// app-level pre-check — see Office_Booking_App_Database_Schema.docx §3.1.
// If a concurrent request already took the slot, Postgres raises a unique
// violation (error code 23505), which the route layer catches and turns
// into a 409.
async function createBooking({ userId, deskId, bookingDate, timeslot }) {
  const { rows } = await pool.query(
    `INSERT INTO bookings (user_id, desk_id, booking_date, timeslot)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, deskId, bookingDate, timeslot]
  );
  return rows[0];
}

async function listForUser(userId, status) {
  const params = [userId];
  let query = `SELECT * FROM bookings WHERE user_id = $1`;
  if (status) {
    params.push(status);
    query += ` AND status = $${params.length}`;
  }
  query += ` ORDER BY booking_date DESC, created_at DESC`;
  const { rows } = await pool.query(query, params);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
  return rows[0];
}

async function cancel(id, userId) {
  const { rows } = await pool.query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return rows[0];
}

// Supports the check-in story — sets checked_in_at, but only while the
// booking is still 'confirmed' (i.e. hasn't already been auto-released).
async function checkIn(id, userId) {
  const { rows } = await pool.query(
    `UPDATE bookings SET status = 'checked_in', checked_in_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
     RETURNING *`,
    [id, userId]
  );
  return rows[0];
}

// Used by the scheduled no-show job (jobs/releaseNoShows.js).
async function releaseNoShows(graceMinutes = 15) {
  const { rows } = await pool.query(
    `UPDATE bookings
     SET status = 'released'
     WHERE status = 'confirmed'
       AND checked_in_at IS NULL
       AND (booking_date + CASE timeslot
              WHEN 'AM' THEN TIME '09:00'
              WHEN 'PM' THEN TIME '13:00'
              ELSE TIME '09:00'
            END) + (INTERVAL '1 minute' * $1) < now()
     RETURNING id`,
    [graceMinutes]
  );
  return rows;
}

async function listAll({ date, status } = {}) {
  const conditions = [];
  const params = [];
  if (date) {
    params.push(date);
    conditions.push(`booking_date = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT * FROM bookings ${where} ORDER BY booking_date DESC`,
    params
  );
  return rows;
}

module.exports = {
  createBooking,
  listForUser,
  findById,
  cancel,
  checkIn,
  releaseNoShows,
  listAll,
};
