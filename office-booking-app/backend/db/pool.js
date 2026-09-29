const { Pool } = require("pg");

// DATABASE_URL example: postgres://user:password@localhost:5432/office_booking
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
