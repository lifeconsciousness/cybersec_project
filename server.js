const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(session({ secret: "your_secret_key", resave: false, saveUninitialized: true }));

// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/api", require("./routes/bookingRoutes"));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "protected")));

// Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));


