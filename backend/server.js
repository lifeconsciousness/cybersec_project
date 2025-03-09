const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("users.db");
const logsDb = new sqlite3.Database("logs.db");
const bookingsDb = new sqlite3.Database("bookings.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

db.run(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)"
);
bookingsDb.run(`
  CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      date TEXT,
      people INTEGER,
      table_number INTEGER,
      UNIQUE(date, table_number)
  )
`);
logsDb.run(`
  CREATE TABLE IF NOT EXISTS logs (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    message TEXT,
                                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                                  )
`);

// Store failed attempts per IP
const failedAttempts = {};

// Serve static files
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// Middleware to limit login attempts per IP
const loginLimiter = (req, res, next) => {
  const ip = req.ip;

  if (!failedAttempts[ip]) {
    failedAttempts[ip] = { count: 0, lastAttempt: Date.now() };
  }

  const timeSinceLastAttempt = Date.now() - failedAttempts[ip].lastAttempt;

  if (timeSinceLastAttempt > 15 * 60 * 100) {
    // Reset after 15 min
    failedAttempts[ip].count = 0;
  }

  if (failedAttempts[ip].count >= 5) {
    return res.status(429).send("Too many failed attempts. Try again later.");
  }

  next();
};

// Helper function to record failed attempts
function recordFailedAttempt(ip) {
  if (!failedAttempts[ip]) {
    failedAttempts[ip] = { count: 0, lastAttempt: Date.now() };
  }
  failedAttempts[ip].count += 1;
  failedAttempts[ip].lastAttempt = Date.now();
}

// Function to log messages to the logs database
function logToDatabase(message) {
  const timestamp = new Date().toISOString();
  logsDb.run("INSERT INTO logs (message) VALUES (?)", [`${timestamp} - ${message}`], (err) => {
    if (err) {
      console.error("Error logging to the database:", err);
    }
  });
}
// Middleware to protect routes
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
      return res.status(401).send("Unauthorized. Please log in first.");
  }
  next();
};

// Registration endpoint (secure version)
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  // check if username is already taken
  const userExistsQuery = `SELECT * FROM users WHERE username = ?`;

  db.get(userExistsQuery, [username], async (err, user) => {
    if (user) {
      logToDatabase( "Tried to take username " + username);
      return res.send("This username is already taken");
    }
  });

  // Hash the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;

  db.run(query, [username, hashedPassword], function (err) {
    if (err) {

      logToDatabase("Failed registration, username: " + username);
      res.status(400).send("Error registering user.");
    } else {
      logToDatabase("User registered successfully: " + username);
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
    if (!user) {
      recordFailedAttempt(ip);
      logToDatabase(`Failed login attempt, username=${username}`);
      return res.status(500).send("Username or password is incorrect.");
    }else if (err){
      logToDatabase(`Login attempt failed, username=${username}`);
      return res.status(500).send("Database error.");

    }

    // Compare hashed password
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      failedAttempts[ip] = { count: 0, lastAttempt: Date.now() }; // Reset attempts on success
      // req.session.user = user.username; // Store user in sessi/on
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

app.get("/logout", (req, res) => {
  if (req.session) {
      req.session.destroy(err => {
          if (err) {
              return res.status(500).send("Failed to log out.");
          }
          res.redirect("/");
      });
  } else {
      res.redirect("/");
  }
});



app.get("/session-check", (req, res) => {
  if (req.session.user) {
      res.send({ loggedIn: true });
  } else {
      res.status(401).send({ loggedIn: false });
  }
});


/// 🔹 **Get Available Tables**
app.get("/api/available-tables", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date is required" });

  bookingsDb.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const bookedTables = rows.map(row => row.table_number);
      const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.includes(t));

      res.json({ availableTables });
  });
});


app.post("/api/book", (req, res) => {
  if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
  }

  const username = req.session.user.username;  // Get the logged-in user's username
  const { date, people, tables } = req.body;
  const tableCount = parseInt(tables, 10);

  console.log(username, date, people, tables, tableCount)

  if (!date || !people || isNaN(tableCount) || tableCount <= 0) {
      return res.status(400).json({ error: "Invalid input" });
  }

  bookingsDb.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const bookedTables = new Set(rows.map(row => row.table_number));
      const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.has(t));

      if (availableTables.length < tableCount) {
          return res.status(400).json({ error: "Not enough tables available" });
      }

      const selectedTables = availableTables.slice(0, tableCount);

      const insertPromises = selectedTables.map(table =>
          new Promise((resolve, reject) => {
              bookingsDb.run("INSERT INTO bookings (name, date, people, table_number) VALUES (?, ?, ?, ?)",
                  [username, date, people, table], function (err) {
                      if (err) return reject(err);
                      resolve(this.lastID);
                  });
          })
      );

      Promise.all(insertPromises)
          .then(ids => res.status(201).json({ message: "Booking successful!", bookingIds: ids }))
          .catch(err => res.status(500).json({ error: "Database error" }));
  });
});


// 🔹 **Get All Bookings**
app.get("/api/bookings", (req, res) => {
  bookingsDb.all("SELECT * FROM bookings", [], (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows);
  });
});

app.get("/api/user-bookings", (req, res) => {
  if (!req.session.user) {
      return res.status(401).json({ error: "Not logged in" });
  }

  const username = req.session.user.username;
  bookingsDb.all("SELECT * FROM bookings WHERE name = ?", [username], (err, rows) => {
      if (err) {
          return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
  });
});

app.get("/get-username", (req, res) => {
  if (req.session.user) {
      res.json({ username: req.session.user.username });
  } else {
      res.status(401).json({ error: "Not logged in" });
  }
});


// Protect landing page
app.get("/landing.html", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "protected", "landing.html"));
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
