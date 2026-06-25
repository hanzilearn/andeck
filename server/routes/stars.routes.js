// server/routes/stars.routes.js
const express = require('express');
const Star = require('../models/star');
const { auth } = require('../middleware/auth');

const router = express.Router();

function normalizeLevel(level) {
  if (level == null) return level;
  if (typeof level === 'string' && level.startsWith('deck_')) return level;
  if (!isNaN(level) && !level.toString().includes('_')) return parseInt(level, 10);
  return level;
}

router.post('/stars', auth, async (req, res) => {
  let { level, stars } = req.body;
  if (!level) return res.status(400).json({ error: 'Thieu level' });
  level = normalizeLevel(level);
  await Star.findOneAndUpdate(
    { email: req.user.email, level },
    { stars: stars || [] },
    { upsert: true, new: true }
  );
  res.json({ ok: true });
});

router.get('/stars', auth, async (req, res) => {
  const level = normalizeLevel(req.query.level);
  if (!level) return res.json({ stars: [] });
  const doc = await Star.findOne({ email: req.user.email, level });
  res.json({ stars: doc ? doc.stars : [] });
});

module.exports = router;
