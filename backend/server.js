const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const app = express();
const db = new sqlite3.Database("users.db"); // SQLite database for users & bookings
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files (frontend)

app.use(session({
    secret: "your_secret_key",  // Change this to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// ✅ Ensure the users table exists
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
    )
`);

// ✅ Ensure the bookings table exists (50 tables max)
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

// 🔹 **Homepage Route**
app.get("/", (req, res) => {
    res.send("Welcome to the Booking API! Use the API endpoints to interact.");
});

// 🔹 **Get Available Tables**
app.get("/api/available-tables", (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });

    db.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
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

    if (!date || !people || isNaN(tableCount) || tableCount <= 0) {
        return res.status(400).json({ error: "Invalid input" });
    }

    db.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const bookedTables = new Set(rows.map(row => row.table_number));
        const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.has(t));

        if (availableTables.length < tableCount) {
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
            .then(ids => res.status(201).json({ message: "Booking successful!", bookingIds: ids }))
            .catch(err => res.status(500).json({ error: "Database error" }));
    });
});


// 🔹 **Get All Bookings**
app.get("/api/bookings", (req, res) => {
    db.all("SELECT * FROM bookings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(rows);
    });
});

app.get("/api/user-bookings", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const username = req.session.user.username;
    db.all("SELECT * FROM bookings WHERE name = ?", [username], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows);
    });
});



app.post("/register", (req, res) => {
    const { username, password } = req.body;

    // SQL Injection vulnerability: Use parameterized queries
    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;

    db.run(query, [username, password], function (err) {
        if (err) {
            res.status(500).send("Error registering user.");
        } else {
            // Automatically log in the user after successful registration
            const loginQuery = `SELECT * FROM users WHERE username = ? AND password = ?`;

            db.get(loginQuery, [username, password], (err, row) => {
                if (err || !row) {
                    res.status(500).send("Error logging in after registration.");
                } else {
                    req.session.user = { username: row.username }; // Store user info in session
                    res.redirect("/landing.html"); // Redirect to the landing page after successful login
                }
            });
        }
    });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.get(query, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.user = { username: row.username };
    res.json({ success: true, redirect: "/landing.html" });
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

app.get("/get-username", (req, res) => {
    if (req.session.user) {
        res.json({ username: req.session.user.username });
    } else {
        res.status(401).json({ error: "Not logged in" });
    }
});


// 🚀 **Start Server**
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
