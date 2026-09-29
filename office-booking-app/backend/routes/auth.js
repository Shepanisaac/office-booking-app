const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createUser, findByEmail } = require("../models/userModel");

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "bad_request", message: "name, email, and password are required" });
  }

  const existing = await findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "conflict", message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({ name, email, passwordHash });
  res.status(201).json(user);
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await findByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at },
  });
});

module.exports = router;
