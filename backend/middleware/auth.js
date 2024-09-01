function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Необходима аутентификация' });
}

module.exports = { isAuthenticated };
