function isAuthenticated(req, res, next) {
  console.log('Checking authentication. isAuthenticated:', req.isAuthenticated());
  console.log('Session:', req.session);
  console.log('User:', req.user);
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Необходима аутентификация' });
}

module.exports = { isAuthenticated };
