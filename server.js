const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");

const app = express();
const db = new sqlite3.Database("users.db");

app.use(bodyParser.urlencoded({ extended: true }));

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");

// serve static files (for login and registration pages)
// app.use(express.static("public"));
app.use(express.static(__dirname + "/public"));


// registration endpoint 
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    // SQL Injection vulnerability: No parameterized query!
    const query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}')`;

    db.run(query, function (err) {
        if (err) {
            res.send("Error registering user.");
        } else {
            res.send("Registration successful! You can now log in.");
        }
    });
});

// rogin endpoint 
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    // SQL Injection vulnerability: No parameterized query!
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    db.get(query, (err, row) => {
        if (row) {
            res.send("Login successful!");
        } else {
            res.send("Invalid credentials.");
        }
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
