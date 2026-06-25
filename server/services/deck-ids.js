// server/services/deck-ids.js
const crypto = require('crypto');

function generateDeckId() {
  return crypto.randomUUID();
}

function generateWordId() {
  return 'w_' + Math.random().toString(36).slice(2, 9);
}

function deckLevelKey(deckId) {
  return 'deck_' + deckId;
}

module.exports = { generateDeckId, generateWordId, deckLevelKey };
