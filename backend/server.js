const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");


const app = express();
const db = new sqlite3.Database("users.db");

app.use(bodyParser.urlencoded({ extended: true }));

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)");

// serve static files (for login and registration pages)
app.use(express.static(__dirname + "/public"));
// app.use(cors());


app.use(session({
    secret: "your_secret_key",  // Change this to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

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
            // res.send("Login successful!");
            res.redirect("/landing.html");
        } else {
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

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
