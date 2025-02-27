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


// 🔹 **Create a New Booking**
app.post("/api/book", (req, res) => {
    const { name, date, people, tables } = req.body;
    const tableCount = parseInt(tables, 10);

    if (!name || !date || !people || isNaN(tableCount) || tableCount <= 0) {
        return res.status(400).json({ error: "Invalid input" });
    }

    db.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error 1" });

        const bookedTables = new Set(rows.map(row => row.table_number));
        const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.has(t));

        console.log("Available tables:", availableTables); // ✅ Debugging Step 1

        if (availableTables.length < tableCount) {
            return res.status(400).json({ error: "Not enough tables available" });
        }

        const selectedTables = availableTables.slice(0, tableCount);
        console.log("Selected tables:", selectedTables); // ✅ Debugging Step 2

        const insertPromises = selectedTables.map(table =>
            new Promise((resolve, reject) => {
                db.run("INSERT INTO bookings (name, date, people, table_number) VALUES (?, ?, ?, ?)",
                    [name, date, people, table], function (err) {
                        if (err) {
                            console.error(`Failed to insert table ${table}:`, err); // ✅ Debugging Step 3
                            return reject(err);
                        }
                        resolve(this.lastID);
                    });
            })
        );

        Promise.all(insertPromises)
            .then(ids => res.status(201).json({ message: "Booking successful!", bookingIds: ids }))
            .catch(err => {
                console.error("Database Error:", err);
                res.status(500).json({ error: err.message.includes("UNIQUE constraint failed") ? "Table already booked (but shouldn't be!)" : "Database error" });
            });
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
         req.session = {users: row};

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
