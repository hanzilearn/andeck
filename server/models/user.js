// server/models/user.js — draft (Phase 0)
const mongoose = require('mongoose');
const { DEFAULT_DECK_QUOTA, DEFAULT_WORD_QUOTA } = require('../config');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  type: { type: String, enum: ['user', 'ctv', 'admin'], default: 'user' },
  deckQuota: { type: Number, default: DEFAULT_DECK_QUOTA },
  wordQuota: { type: Number, default: DEFAULT_WORD_QUOTA },
  zalo: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
