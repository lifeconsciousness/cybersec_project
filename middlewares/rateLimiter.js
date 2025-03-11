const failedAttempts = {};

const loginLimiter = (req, res, next) => {
  const ip = req.ip;

  if (!failedAttempts[ip]) {
    failedAttempts[ip] = { count: 0, lastAttempt: Date.now() };
  }

  const timeSinceLastAttempt = Date.now() - failedAttempts[ip].lastAttempt;
  if (timeSinceLastAttempt > 15 * 60 * 1000) {
    failedAttempts[ip].count = 0;
  }

  if (failedAttempts[ip].count >= 5) {
    return res.status(429).send("Too many failed attempts. Try again later.");
  }

  next();
};

function recordFailedAttempt(ip) {
  if (!failedAttempts[ip]) {
    failedAttempts[ip] = { count: 0, lastAttempt: Date.now() };
  }
  failedAttempts[ip].count += 1;
  failedAttempts[ip].lastAttempt = Date.now();
}

module.exports = { loginLimiter, recordFailedAttempt };
