const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const { isAuthenticated } = require('./middleware/auth');
require('dotenv').config();

const app = express();

// Middleware setup
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

const User = require('./models/User');

// Passport configuration
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email', 'guilds', 'connections'] // Добавляем 'connections'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Discord profile:', profile); // Добавляем логирование профиля
    let user = await User.findOne({ discordId: profile.id });
    if (!user) {
      user = await User.create({
        discordId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        email: profile.email,
        avatar: profile.avatar,
        locale: profile.locale,
        flags: profile.flags,
        premiumType: profile.premium_type,
        banner: profile.banner,
        accentColor: profile.accent_color,
        guilds: profile.guilds,
        connections: profile.connections // Сохраняем connections
      });
    } else {
      user.username = profile.username;
      user.discriminator = profile.discriminator;
      user.email = profile.email;
      user.avatar = profile.avatar;
      user.locale = profile.locale;
      user.flags = profile.flags;
      user.premiumType = profile.premium_type;
      user.banner = profile.banner;
      user.accentColor = profile.accent_color;
      user.guilds = profile.guilds;
      user.connections = profile.connections; // Обновляем connections
      await user.save();
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Discord OAuth routes
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', 
  passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('http://localhost:3000/');
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
    res.clearCookie('connect.sid'); // Clear the session cookie
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
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));