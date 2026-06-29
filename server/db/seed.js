// server/db/seed.js — admin mặc định (không HSK)
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { DEFAULT_DECK_QUOTA, DEFAULT_WORD_QUOTA } = require('../config');
const { migrateTotalWordQuota } = require('../services/quota');

async function ensureDefaults() {
  const defaults = [
    { email: 'admin1', password: 'Andinhlinh2@', role: 'admin', type: 'admin' },
    { email: 'admin2', password: 'Andinhlinh2@', role: 'admin', type: 'admin' },
    {
      email: 'demo',
      password: 'demo123',
      role: 'user',
      type: 'user',
      deckQuota: DEFAULT_DECK_QUOTA,
      wordQuota: DEFAULT_WORD_QUOTA
    }
  ];

  for (const d of defaults) {
    const exists = await User.findOne({ email: d.email });
    if (!exists) {
      const passwordHash = await bcrypt.hash(d.password, 10);
      const deckQuota = d.deckQuota ?? DEFAULT_DECK_QUOTA;
      const wordQuota = d.wordQuota ?? DEFAULT_WORD_QUOTA;
      await User.create({
        email: d.email,
        passwordHash,
        role: d.role,
        type: d.type,
        deckQuota,
        wordQuota,
        totalWordQuota: deckQuota * wordQuota
      });
      console.log('  ✅ Tạo TK: ' + d.email);
    }
  }

  const migrated = await migrateTotalWordQuota();
  if (migrated > 0) {
    console.log('  ✅ Migration totalWordQuota: ' + migrated + ' user');
  }
}

module.exports = { ensureDefaults };
