// Requires a running test database with the schema applied and at least
// one seeded desk. Covers the Phase 5 bug classes named in the SDLC plan:
// form field validation, date/timezone handling, and double-booking.

const request = require("supertest");
const app = require("../app");
const pool = require("../db/pool");

let token;
let userId;
let deskId;
const testEmail = `booking-test-${Date.now()}@example.com`;
const bookingDate = "2099-06-15"; // far-future, avoids clashing with real bookings

beforeAll(async () => {
  const register = await request(app)
    .post("/v1/auth/register")
    .send({ name: "Booking Tester", email: testEmail, password: "test-password-123" });
  userId = register.body.id;

  const login = await request(app)
    .post("/v1/auth/login")
    .send({ email: testEmail, password: "test-password-123" });
  token = login.body.token;

  const { rows } = await pool.query(`SELECT id FROM desks LIMIT 1`);
  if (!rows[0]) throw new Error("Seed at least one desk before running these tests.");
  deskId = rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM bookings WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await pool.end();
});

describe("POST /v1/bookings — validation", () => {
  it("rejects a request with no auth token (401)", async () => {
    const res = await request(app)
      .post("/v1/bookings")
      .send({ desk_id: deskId, booking_date: bookingDate, timeslot: "AM" });
    expect(res.status).toBe(401);
  });

  it("rejects a missing required field (400)", async () => {
    const res = await request(app)
      .post("/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ desk_id: deskId, booking_date: bookingDate }); // no timeslot
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/bookings — happy path and double-booking", () => {
  let bookingId;

  it("creates a booking successfully", async () => {
    const res = await request(app)
      .post("/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ desk_id: deskId, booking_date: bookingDate, timeslot: "PM" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("confirmed");
    bookingId = res.body.id;
  });

  it("returns 409 for the same desk/date/timeslot", async () => {
    const res = await request(app)
      .post("/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ desk_id: deskId, booking_date: bookingDate, timeslot: "PM" });

    expect(res.status).toBe(409);
  });

  it("blocks a second booking for the same user on the same date, even a different timeslot (one desk per day)", async () => {
    const res = await request(app)
      .post("/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ desk_id: deskId, booking_date: bookingDate, timeslot: "AM" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already have a desk booked/i);
  });

  it("allows the same user to book on a different date", async () => {
    const res = await request(app)
      .post("/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ desk_id: deskId, booking_date: "2099-06-16", timeslot: "AM" });

    expect(res.status).toBe(201);

    // cleanup — this booking isn't reused by later tests
    await pool.query(`DELETE FROM bookings WHERE id = $1`, [res.body.id]);
  });

  it("lists the user's own bookings", async () => {
    const res = await request(app).get("/v1/bookings").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("checks in successfully while still confirmed", async () => {
    const res = await request(app)
      .post(`/v1/bookings/${bookingId}/check-in`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("checked_in");
    expect(res.body.checked_in_at).not.toBeNull();
  });

  it("cancels a booking", async () => {
    const res = await request(app)
      .delete(`/v1/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });
});

describe("GET /v1/desks/availability — date/timezone handling", () => {
  it("returns the requested desk marked unavailable once booked", async () => {
    await request(app)
      .post("/v1/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({ desk_id: deskId, booking_date: "2099-07-01", timeslot: "AM" });

    const res = await request(app)
      .get(`/v1/desks/availability?date=2099-07-01&timeslot=AM`)
      .set("Authorization", `Bearer ${token}`);

    const target = res.body.find((entry) => entry.desk.id === deskId);
    expect(target.available).toBe(false);
  });

  it("returns the same desk as available on a different date (no timezone bleed)", async () => {
    const res = await request(app)
      .get(`/v1/desks/availability?date=2099-07-02&timeslot=AM`)
      .set("Authorization", `Bearer ${token}`);

    const target = res.body.find((entry) => entry.desk.id === deskId);
    expect(target.available).toBe(true);
  });

  it("rejects a request missing the date param (400)", async () => {
    const res = await request(app)
      .get(`/v1/desks/availability?timeslot=AM`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
