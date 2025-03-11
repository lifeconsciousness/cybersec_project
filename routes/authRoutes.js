const express = require("express");
const bcrypt = require("bcrypt");
const { db } = require("../utils/db");
const { logToDatabase } = require("../utils/logger");
const { loginLimiter, recordFailedAttempt } = require("../middlewares/rateLimiter");
const { requireLogin } = require("../middlewares/authMiddleware");
const path = require("path");

const router = express.Router();

// Register User
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (user) {
      logToDatabase("Tried to take username " + username);
      return res.send("This username is already taken");
    }
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function (err) {
    if (err) {
      logToDatabase("Failed registration, username: " + username);
      res.status(400).send("Error registering user.");
    } else {
      logToDatabase("User registered successfully: " + username);
      res.send("Registration successful!");
    }
  });
});

// Login User
router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (!user) {
      recordFailedAttempt(ip);
      logToDatabase(`Failed login attempt, username=${username}`);
      return res.status(500).send("Username or password is incorrect.");
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = { username: user.username };
      logToDatabase(`User logged in: ${username}`);
      res.redirect("/landing.html");
    } else {
      logToDatabase(`Failed login attempt for username: ${username}`);
      recordFailedAttempt(ip);
      res.send("Invalid credentials.");
    }
  });
});

// Logout User
router.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) return res.status(500).send("Failed to log out.");
      res.redirect("/");
    });
  } else {
    res.redirect("/");
  }
});

router.get("/get-username", (req, res) => {
    if (req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.status(401).json({ error: "Not logged in" });
    }
  });

module.exports = router;
