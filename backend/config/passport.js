const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const User = require('../models/User');

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email', 'guilds', 'connections']
}, async (accessToken, refreshToken, profile, done) => {
  try {
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
        connections: profile.connections
      });
    } else {
      Object.assign(user, {
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
        connections: profile.connections
      });
      await user.save();
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
