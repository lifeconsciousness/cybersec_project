const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const app = express();
const db = new sqlite3.Database("users.db");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Support JSON body parsing
app.use(cors());
app.use(express.static(__dirname + "/public"));

// Store failed attempts per IP
const failedAttempts = {};

// Middleware to limit login attempts per IP
const loginLimiter = (req, res, next) => {
    const ip = req.ip;
    
    if (!failedAttempts[ip]) {
        failedAttempts[ip] = { count: 0, lastAttempt: Date.now() };
    }

    const timeSinceLastAttempt = Date.now() - failedAttempts[ip].lastAttempt;

    if (timeSinceLastAttempt > 15 * 60 * 100) { // Reset after 15 min
        failedAttempts[ip].count = 0;
    }

    if (failedAttempts[ip].count >= 5) {
        return res.status(429).send("Too many failed attempts. Try again later.");
    }

    next();
};

// Securely create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, 
    username TEXT UNIQUE, 
    password TEXT
)`);

// Registration endpoint (secure version)
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
    
    db.run(query, [username, hashedPassword], function (err) {
        if (err) {
            res.status(400).send("Error registering user.");
        } else {
            res.send("Registration successful!");
        }
    });
});

// Login endpoint with brute-force protection
app.post("/login", loginLimiter, (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;

    const query = `SELECT * FROM users WHERE username = ?`;

    db.get(query, [username], async (err, user) => {
        if (err || !user) {
            recordFailedAttempt(ip);
            return res.send("Invalid credentials.");
        }

        // Compare hashed password
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            failedAttempts[ip] = { count: 0, lastAttempt: Date.now() }; // Reset attempts on success
            res.send("Login successful!");
        } else {
            recordFailedAttempt(ip);
            res.send("Invalid credentials.");
        }
    });
});

// Helper function to record failed attempts
function recordFailedAttempt(ip) {
    if (!failedAttempts[ip]) {
        failedAttempts[ip] = { count: 0, lastAttempt: Date.now() };
    }
    failedAttempts[ip].count += 1;
    failedAttempts[ip].lastAttempt = Date.now();
}

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
