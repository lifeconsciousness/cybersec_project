const express = require("express");
const { bookingsDb } = require("../utils/db");
const { requireLogin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Get available tables
router.get("/available-tables", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date is required" });

  bookingsDb.all("SELECT table_number FROM bookings WHERE date = ?", [date], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    const bookedTables = rows.map(row => row.table_number);
    const availableTables = Array.from({ length: 50 }, (_, i) => i + 1).filter(t => !bookedTables.includes(t));

    res.json({ availableTables });
  });
});

// Get all bookings
router.get("/bookings", requireLogin, (req, res) => {
  bookingsDb.all("SELECT * FROM bookings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

module.exports = router;
