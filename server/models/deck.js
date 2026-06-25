// server/models/deck.js — draft (Phase 0)
const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  id: { type: String, required: true },
  primary: { type: String, required: true },
  reading: { type: String, default: '' },
  meaning: { type: String, required: true },
  exPrimary: { type: String, default: '' },
  exReading: { type: String, default: '' },
  exMeaning: { type: String, default: '' },
  pos: { type: String, default: '' },
  note: { type: String, default: '' },
  extra: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const deckSchema = new mongoose.Schema({
  email: { type: String, required: true },
  deckId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  langPair: { type: String, required: true },
  words: { type: [wordSchema], default: [] },
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

deckSchema.index({ email: 1, deckId: 1 });
deckSchema.index({ email: 1, updatedAt: -1 });

module.exports = mongoose.models.Deck || mongoose.model('Deck', deckSchema);
