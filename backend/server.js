'use strict';

const express = require('express');
const passport = require('passport');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const { isAuthenticated } = require('./middleware/auth');
require('dotenv').config();

// Импортируем конфигурацию Passport
require('./config/passport');

const app = express();

// Простая функция-обертка для логирования
const logger = (message, level = 'info') => {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${level.toUpperCase()}: ${message}`);
};

// Middleware setup
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger('Connected to MongoDB'))
  .catch(err => {
    logger(`Error connecting to MongoDB: ${err.message}`, 'error');
    process.exit(1);
  });

mongoose.connection.on('error', err => {
  logger(`MongoDB connection error: ${err.message}`, 'error');
});

const User = require('./models/User');

// Discord OAuth routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', 
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL);
  }
);

app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Routes
app.get('/', (req, res) => {
  res.send('FORZA.EVENTS Backend');
});

const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);

const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger(`Server started on port ${PORT}`));