const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).send("Unauthorized. Please log in first.");
  }
  next();
};

module.exports = { requireLogin };
