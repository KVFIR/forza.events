const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);  // Завершаем процесс в случае ошибки подключения
  });

// Обработка ошибок после начального подключения
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

const User = require('./models/User');

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ discordId: profile.id });
    if (!user) {
      user = await User.create({
        discordId: profile.id,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar
      });
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.get('/', (req, res) => {
  res.send('FORZA.EVENTS Backend');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

const eventsRouter = require('./routes/events');

// ... после настройки middleware ...

app.use('/api/events', isAuthenticated, eventsRouter);

const cors = require('cors');
const { isAuthenticated } = require('./middleware/auth');

app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
