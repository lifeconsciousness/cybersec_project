const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");

const app = express();
const db = new sqlite3.Database("users.db");
const logsDb = new sqlite3.Database("logs.db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)");
db.run(`
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

// Serve static files
app.use(express.static(__dirname + "/public"));

app.use(session({
  secret: "your_secret_key",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Function to log messages to the logs database
function logToDatabase(message) {
  logsDb.run("INSERT INTO logs (message) VALUES (?)", [message], (err) => {
    if (err) {
      console.error("Error logging to the database:", err);
    }
  });
}

// 🔹 **User Registration**
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    const msg = `Registration attempt with missing fields: username=${username}`;
    logToDatabase(msg);
    console.log(msg);
    return res.status(400).send("Username and password are required.");
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      const msg = "Database error during registration.";
      logToDatabase(msg);
      console.error(msg);
      return res.status(500).send("Database error.");
    }

    if (row) {
      const msg = `Registration failed: Username '${username}' already exists.`;
      logToDatabase(msg);
      console.log(msg);
      return res.status(400).send("User already exists.");
    }

    db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function (err) {
      if (err) {
        const msg = "Error registering user.";
        logToDatabase(msg);
        console.error(msg);
        return res.status(500).send("Error registering user.");
      }

      const msg = `User registered successfully: ${username}`;
      logToDatabase(msg);
      console.log(msg);
      res.send("Registration successful! You can now log in.");
    });
  });
});

// 🔹 **User Login**
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    const msg = `Login attempt with missing fields: username=${username}`;
    logToDatabase(msg);
    console.log(msg);
    return res.status(400).send("Username and password are required.");
  }

  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (err) {
      const msg = "Database error during login.";
      logToDatabase(msg);
      console.error(msg);
      return res.status(500).send("Database error.");
    }

    if (row) {
      req.session.user = { username: row.username };
      const msg = `User logged in: ${username}`;
      logToDatabase(msg);
      console.log(msg);
      res.redirect("/landing.html");
    } else {
      const msg = `Failed login attempt for username: ${username}`;
      logToDatabase(msg);
      console.log(msg);
      res.status(401).send("Invalid credentials.");
    }
  });
});

// 🔹 **User Logout**
app.get("/logout", (req, res) => {
  if (req.session) {
    const msg = `User logged out: ${req.session.user?.username || "Unknown"}`;
    logToDatabase(msg);
    console.log(msg);
    req.session.destroy(err => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).send("Failed to log out.");
      }
      res.redirect("/");
    });
  } else {
    res.redirect("/");
  }
});

// 🔹 **Check User Session**
app.get("/session-check", (req, res) => {
  if (req.session.user) {
    const msg = `Session check: User '${req.session.user.username}' is logged in.`;
    logToDatabase(msg);
    console.log(msg);
    res.send({ loggedIn: true });
  } else {
    const msg = "Session check: No user logged in.";
    logToDatabase(msg);
    console.log(msg);
    res.status(401).send({ loggedIn: false });
  }
});

// 🔹 **Get Available Tables**
app.get("/api/available-tables", (req, res) => {
  const { date } = req.query;
  if (!date) {
    const msg = "Attempt to check tables without a date.";
    logToDatabase(msg);
    console.log(msg);
    return res.status(400).json({ error: "Date is required" });
  }

  db.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
    if (err) {
      const msg = "Database error fetching available tables.";
      logToDatabase(msg);
      console.error(msg);
      return res.status(500).json({ error: "Database error" });
    }

    const bookedTables = rows.map(row => row.table_number);
    const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.includes(t));

    const msg = `Available tables for date ${date}: ${availableTables}`;
    logToDatabase(msg);
    console.log(msg);
    res.json({ availableTables });
  });
});

// 🔹 **Book a Table**
app.post("/api/book", (req, res) => {
  if (!req.session.user) {
    const msg = "Unauthorized booking attempt.";
    logToDatabase(msg);
    console.log(msg);
    return res.status(401).json({ error: "Not logged in" });
  }

  const username = req.session.user.username;
  const { date, people, tables } = req.body;
  const tableCount = parseInt(tables, 10);

  if (!date || !people || isNaN(tableCount) || tableCount <= 0) {
    const msg = `Invalid booking attempt by '${username}': ${JSON.stringify(req.body)}`;
    logToDatabase(msg);
    console.log(msg);
    return res.status(400).json({ error: "Invalid input" });
  }

  db.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
    if (err) {
      const msg = "Database error checking bookings.";
      logToDatabase(msg);
      console.error(msg);
      return res.status(500).json({ error: "Database error" });
    }

    const bookedTables = new Set(rows.map(row => row.table_number));
    const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.has(t));

    if (availableTables.length < tableCount) {
      const msg = `Booking failed for '${username}': Not enough tables available.`;
      logToDatabase(msg);
      console.log(msg);
      return res.status(400).json({ error: "Not enough tables available" });
    }

    const selectedTables = availableTables.slice(0, tableCount);

    const insertPromises = selectedTables.map(table =>
      new Promise((resolve, reject) => {
        db.run("INSERT INTO bookings (name, date, people, table_number) VALUES (?, ?, ?, ?)",
          [username, date, people, table], function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
          });
      })
    );

    Promise.all(insertPromises)
      .then(ids => {
        const msg = `Booking successful for '${username}' on ${date}: Tables ${selectedTables}`;
        logToDatabase(msg);
        console.log(msg);
        res.status(201).json({ message: "Booking successful!", bookingIds: ids });
      })
      .catch(err => {
        const msg = "Database error during booking.";
        logToDatabase(msg);
        console.error(msg);
        res.status(500).json({ error: "Database error" });
      });
  });
});

// 🔹 **Get All Bookings**
app.get("/api/bookings", (req, res) => {
  db.all("SELECT * FROM bookings", [], (err, rows) => {
    if (err) {
      const msg = "Database error fetching bookings.";
      logToDatabase(msg);
      console.error(msg);
      return res.status(500).json({ error: "Database error" });
    }
    const msg = `Fetched ${rows.length} total bookings.`;
    logToDatabase(msg);
    console.log(msg);
    res.json(rows);
  });
});

// 🔹 **Get User Bookings**
app.get("/api/user-bookings", (req, res) => {
  if (!req.session.user) {
    const msg = "Unauthorized attempt to fetch user bookings.";
    logToDatabase(msg);
    console.log(msg);
    return res.status(401).json({ error: "Not logged in" });
  }

  const username = req.session.user.username;
  db.all("SELECT * FROM bookings WHERE name = ?", [username], (err, rows) => {
    if (err) {
      const msg = "Database error fetching user bookings.";
      logToDatabase(msg);
      console.error(msg);
      return res.status(500).json({ error: "Database error" });
    }
    const msg = `User '${username}' fetched ${rows.length} bookings.`;
    logToDatabase(msg);
    console.log(msg);
    res.json(rows);
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
