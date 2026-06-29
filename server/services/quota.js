// server/services/quota.js — pool từ tổng (totalWordQuota)
const User = require('../models/user');
const Deck = require('../models/deck');
const { DEFAULT_DECK_QUOTA, DEFAULT_WORD_QUOTA } = require('../config');

function resolveTotalWordQuota(user) {
  if (!user) return DEFAULT_DECK_QUOTA * DEFAULT_WORD_QUOTA;
  if (user.totalWordQuota != null && user.totalWordQuota >= 0) {
    return user.totalWordQuota;
  }
  const deckQuota = user.deckQuota ?? DEFAULT_DECK_QUOTA;
  const wordQuota = user.wordQuota ?? DEFAULT_WORD_QUOTA;
  return deckQuota * wordQuota;
}

async function getUserQuotas(email) {
  const user = await User.findOne({ email });
  const deckQuota = user?.deckQuota ?? DEFAULT_DECK_QUOTA;
  const wordQuota = user?.wordQuota ?? DEFAULT_WORD_QUOTA;
  const totalWordQuota = resolveTotalWordQuota(user);
  return { user, deckQuota, wordQuota, totalWordQuota };
}

async function countUserTotalWords(email) {
  const result = await Deck.aggregate([
    { $match: { email } },
    { $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$words', []] } } } } }
  ]);
  return result[0]?.total ?? 0;
}

function wordInsertCapacity(totalWordQuota, totalWords, deckWordCount) {
  const poolRem = Math.max(0, totalWordQuota - totalWords);
  const deckRem = Math.max(0, totalWordQuota - deckWordCount);
  return Math.min(poolRem, deckRem);
}

async function migrateTotalWordQuota() {
  const users = await User.find({
    $or: [{ totalWordQuota: { $exists: false } }, { totalWordQuota: null }]
  });
  if (!users.length) return 0;

  let updated = 0;
  for (const user of users) {
    user.totalWordQuota = (user.deckQuota ?? DEFAULT_DECK_QUOTA) * (user.wordQuota ?? DEFAULT_WORD_QUOTA);
    await user.save();
    updated++;
  }
  return updated;
}

module.exports = {
  resolveTotalWordQuota,
  getUserQuotas,
  countUserTotalWords,
  wordInsertCapacity,
  migrateTotalWordQuota
};
