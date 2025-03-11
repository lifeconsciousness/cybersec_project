const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Move databases into the `db` folder
const db = new sqlite3.Database(path.join(__dirname, "../db/users.db"));
const logsDb = new sqlite3.Database(path.join(__dirname, "../db/logs.db"));
const bookingsDb = new sqlite3.Database(path.join(__dirname, "../db/bookings.db"));

// Initialize tables
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)");
bookingsDb.run(`
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

module.exports = { db, logsDb, bookingsDb };
