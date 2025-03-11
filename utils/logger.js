const { logsDb } = require("./db");

function logToDatabase(message) {
  const timestamp = new Date().toISOString();
  logsDb.run("INSERT INTO logs (message) VALUES (?)", [`${timestamp} - ${message}`], (err) => {
    if (err) {
      console.error("Error logging to the database:", err);
    }
  });
}

module.exports = { logToDatabase };
