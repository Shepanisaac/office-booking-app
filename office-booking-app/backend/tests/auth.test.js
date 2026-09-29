// Requires a running test database with the schema applied
// (DATABASE_URL should point at a disposable test DB, not production).

const request = require("supertest");
const app = require("../app");
const pool = require("../db/pool");

const testEmail = `test-${Date.now()}@example.com`;

afterAll(async () => {
  await pool.query(`DELETE FROM users WHERE email = $1`, [testEmail]);
  await pool.end();
});

describe("POST /v1/auth/register", () => {
  it("creates a new user", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({ name: "Test User", email: testEmail, password: "correct-horse-battery" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Test User", email: testEmail, role: "employee" });
    expect(res.body.password_hash).toBeUndefined(); // never leak the hash
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app)
      .post("/v1/auth/register")
      .send({ name: "Test User Again", email: testEmail, password: "another-password" });

    expect(res.status).toBe(409);
  });

  it("rejects a missing field with 400", async () => {
    const res = await request(app).post("/v1/auth/register").send({ email: "x@example.com" });
    expect(res.status).toBe(400);
  });
});

describe("POST /v1/auth/login", () => {
  it("returns a token for correct credentials", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: testEmail, password: "correct-horse-battery" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app)
      .post("/v1/auth/login")
      .send({ email: testEmail, password: "wrong-password" });

    expect(res.status).toBe(401);
  });
});
