const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const db = new sqlite3.Database("users.db"); // Same database used for users
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());

// Ensure the users table exists
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");

// ✅ **Create a bookings table**
db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    date TEXT,
    time TEXT,
    people INTEGER,
    table_number INTEGER UNIQUE
)`);

app.use(express.static(__dirname + "/public"));

// 🔹 **Booking Endpoint - Create a New Booking**
app.post("/api/book", (req, res) => {
    const { name, date, time, people } = req.body;

    if (!name || !date || !time || !people) {
        return res.status(400).json({ error: "All fields are required" });
    }
    const tableNumbers = [];
    const maxTables = 50;

    db.all("SELECT table_number FROM bookings WHERE date = ? AND time = ?", [date, time], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error"});
        }

        const bookedTables = rows.map(row => row.table_number);
        for (let i = 1; i <= maxTables; i++) {
            if (!bookedTables.includes(i) && tableNumbers.length < tables) {
                tableNumbers.push(i);
            }
        }

        if (tableNumbers.length < tables) {
            return res.status(400).json({error : "Not enough tables available"});
        }
        const insertQuery = `INSERT INTO bookings (name, date, time, people) VALUES (?, ?, ?, ?)`;
        const insterBookings = tableNumbers.map(table => new Promise((resolve, reject) => {
            db.run(insertQuery, [name, date, time, people], function (err) {
                if (err) reject (err);
                resolve(this.lastID);
            });
        }));
        Promise.all(insertBookings)
            .then(ids => res.status(201).json({message : "Booking succesful!"}))
            .catch(() => res.status(500).json({ error: "Database error" }));
});

    const query = 
    db.run(query, [name, date, time, people], function (err) {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.status(201).json({ message: "Booking successful!", bookingId: this.lastID });
    });
});

// 🔹 **Get All Bookings**
app.get("/api/bookings", (req, res) => {
    db.all("SELECT * FROM bookings", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }
        res.json(rows);
    });
});

// 🔹 **User Authentication Routes (No Changes Here)**
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    const query = `INSERT INTO users (username, password) VALUES (?, ?)`;

    db.run(query, [username, password], function (err) {
        if (err) {
            return res.status(500).send("Error registering user.");
        }
        res.send("Registration successful! You can now log in.");
    });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

    db.get(query, [username, password], (err, row) => {
        if (row) {
            res.redirect("/landing.html");
        } else {
            res.send("Invalid credentials.");
        }
    });
});

// Logout endpoint
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get("/session-check", (req, res) => {
    if (req.session && req.session.user) {
        res.send({ loggedIn: true });
    } else {
        res.status(401).send({ loggedIn: false });
    }
});

app.get("/api/available-tables", (req, res) => {
    const { date, time } = req.query;

    db.all("SELECT table_number FROM bookings WHERE date = ? AND time = ?", [date, time], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        const bookedTables = rows.map(row => row.table_number);
        const availableTables = [];
        for (let i = 1; i <= 50; i++) {
            if (!bookedTables.includes(i)) {
                availableTables.push(i);
            }
        }

        res.json({ availableTables });
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
