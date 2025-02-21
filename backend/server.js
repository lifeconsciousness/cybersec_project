const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("users.db"); // SQLite database for users & bookings
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files (frontend)

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
        time TEXT,
        people INTEGER,
        table_number INTEGER UNIQUE
    )
`);

// 🔹 **Homepage Route**
app.get("/", (req, res) => {
    res.send("Welcome to the Booking API! Use the API endpoints to interact.");
});

// 🔹 **Get Available Tables**
app.get("/api/available-tables", (req, res) => {
    const { date, time } = req.query;

    if (!date || !time) {
        return res.status(400).json({ error: "Date and time are required" });
    }

    db.all("SELECT table_number FROM bookings WHERE date = ? AND time = ?", [date, time], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const bookedTables = rows.map(row => row.table_number);
        const availableTables = [];

        for (let i = 1; i <= 50; i++) {
            if (!bookedTables.includes(i)) availableTables.push(i);
        }

        res.json({ availableTables });
    });
});

// 🔹 **Create a New Booking**
app.post("/api/book", (req, res) => {
    const { name, date, time, people, tables } = req.body;

    if (!name || !date || !time || !people || !tables) {
        return res.status(400).json({ error: "All fields are required" });
    }

    db.all("SELECT table_number FROM bookings WHERE date = ? AND time = ?", [date, time], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });

        const bookedTables = rows.map(row => row.table_number);
        const tableNumbers = [];
        
        for (let i = 1; i <= 50; i++) {
            if (!bookedTables.includes(i) && tableNumbers.length < tables) {
                tableNumbers.push(i);
            }
        }

        if (tableNumbers.length < tables) {
            return res.status(400).json({ error: "Not enough tables available" });
        }

        // Insert bookings for each table
        const insertQuery = `INSERT INTO bookings (name, date, time, people, table_number) VALUES (?, ?, ?, ?, ?)`;
        const insertPromises = tableNumbers.map(table => 
            new Promise((resolve, reject) => {
                db.run(insertQuery, [name, date, time, people, table], function (err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                });
            })
        );

        Promise.all(insertPromises)
            .then(ids => res.status(201).json({ message: "Booking successful!", bookingIds: ids }))
            .catch(() => res.status(500).json({ error: "Database error" }));
    });
});

// 🔹 **Get All Bookings**
app.get("/api/bookings", (req, res) => {
    db.all("SELECT * FROM bookings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json(rows);
    });
});

// 🔹 **User Authentication Routes**
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(query, [username, password], function (err) {
        if (err) return res.status(500).json({ error: "Error registering user." });
        res.json({ message: "Registration successful! You can now log in." });
    });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(query, [username, password], (err, row) => {
        if (err || !row) return res.status(401).json({ error: "Invalid credentials" });
         // If using sessions, you can store the user session
         req.session = { user: row };

         // Redirect user
         res.redirect("/landing.html");
    });
});

// 🔹 **Logout Endpoint (Session Not Used Here)**
app.get("/logout", (req, res) => {
    res.json({ message: "Logout successful!" });
});

// 🔹 **Session Check**
app.get("/session-check", (req, res) => {
    res.status(200).json({ loggedIn: false }); // Placeholder since session logic is not implemented
});

// 🚀 **Start Server**
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
