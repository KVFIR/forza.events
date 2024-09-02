const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  discriminator: { type: String, required: true },
  email: { type: String, required: true },
  avatar: String,
  locale: String,
  flags: Number,
  premiumType: Number,
  banner: String,
  accentColor: String,
  guilds: [{ type: Object }],
  connections: [{ type: Object }], // Новое поле
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
