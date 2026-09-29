require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const deskRoutes = require("./routes/desks");
const bookingRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/admin");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/v1/auth", authRoutes);
app.use("/v1/desks", deskRoutes);
app.use("/v1/bookings", bookingRoutes);
app.use("/v1/admin", adminRoutes);

app.get("/v1/health", (req, res) => res.json({ status: "ok" }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server_error", message: "Something went wrong" });
});

module.exports = app;
