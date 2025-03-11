const express = require("express");
const { bookingsDb } = require("../utils/db");
const { requireLogin } = require("../middlewares/authMiddleware");

const router = express.Router();

// Get available tables
router.get("/available-tables", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "Date is required" });

  bookingsDb.all(
    "SELECT table_number FROM bookings WHERE date = ?",
    [date],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });

      const bookedTables = rows.map((row) => row.table_number);
      const availableTables = Array.from(
        { length: 50 },
        (_, i) => i + 1
      ).filter((t) => !bookedTables.includes(t));

      res.json({ availableTables });
    }
  );
});

// Get all bookings
router.get("/bookings", requireLogin, (req, res) => {
  bookingsDb.all("SELECT * FROM bookings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

router.post("/book", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const username = req.session.user.username;
  const ip = req.ip; // Capture the IP address
  const { date, people, tables } = req.body;
  const tableCount = parseInt(tables, 10);

  if (!date || !people || isNaN(tableCount) || tableCount <= 0) {
    return res.status(400).json({ error: "Invalid input" });
  }

  // Check if the IP already has a booking for the given date
  bookingsDb.get(
    "SELECT * FROM bookings WHERE date = ? AND name = ?",
    [date, ip],
    (err, existingBooking) => {
      if (err) return res.status(500).json({ error: "Database error" });

    //   if (existingBooking) {
    //     console.log("iii");
    //     return res
    //       .status(403)
    //       .json({ error: "Only one booking allowed per IP address per day" });
    //   }

      bookingsDb.all(
        "SELECT table_number FROM bookings WHERE date = ?",
        [date],
        (err, rows) => {
          if (err) return res.status(500).json({ error: "Database error" });

          const bookedTables = new Set(rows.map((row) => row.table_number));
          const availableTables = Array.from(
            { length: 50 },
            (_, i) => i + 1
          ).filter((t) => !bookedTables.has(t));

          if (availableTables.length < tableCount) {
            return res
              .status(400)
              .json({ error: "Not enough tables available" });
          }

          const selectedTables = availableTables.slice(0, tableCount);

          const insertPromises = selectedTables.map(
            (table) =>
              new Promise((resolve, reject) => {
                bookingsDb.run(
                  "INSERT INTO bookings (name, date, people, table_number) VALUES (?, ?, ?, ?)",
                  [ip, date, people, table],
                  function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                  }
                );
              })
          );

          Promise.all(insertPromises)
            .then((ids) =>
              res
                .status(201)
                .json({ message: "Booking successful!", bookingIds: ids })
            )
            .catch((err) => res.status(500).json({ error: "Database error" }));
        }
      );
    }
  );
});

router.get("/user-bookings", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const username = req.session.user.username;
  bookingsDb.all(
    "SELECT * FROM bookings WHERE name = ?",
    [username],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
