// server/routes/labels.routes.js — port Hanzi, level = deck_<deckId>
const express = require('express');
const Label = require('../models/label');
const Item = require('../models/item');
const Star = require('../models/star');
const { auth } = require('../middleware/auth');
const { ensureDefaultLabel } = require('../services/labels');

const router = express.Router();

function normalizeLevel(level) {
  if (level == null) return level;
  if (typeof level === 'string' && level.startsWith('deck_')) return level;
  if (!isNaN(level) && !level.toString().includes('_')) return parseInt(level, 10);
  return level;
}

router.get('/labels', auth, async (req, res) => {
  try {
    await ensureDefaultLabel(req.user.email);
    let level = normalizeLevel(req.query.level);
    const query = { email: req.user.email };
    if (level) {
      query.$or = [{ isDefault: true }, { level }];
    }
    const labels = await Label.find(query).sort({ order: 1, createdAt: 1 });
    res.json({
      labels: labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        order: l.order,
        isDefault: l.isDefault,
        level: l.level
      }))
    });
  } catch (err) {
    console.error('GET /api/labels:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/labels', auth, async (req, res) => {
  try {
    let { name, color, level } = req.body;
    if (!name || !color) return res.status(400).json({ error: 'Thieu ten hoac mau' });
    if (!level) return res.status(400).json({ error: 'Thieu level' });
    level = normalizeLevel(level);
    name = name.trim();
    if (name.length === 0) return res.status(400).json({ error: 'Ten khong hop le' });
    if (name.length > 30) return res.status(400).json({ error: 'Ten qua dai' });

    await ensureDefaultLabel(req.user.email);
    const count = await Label.countDocuments({ email: req.user.email, level });
    if (count >= 7) return res.status(400).json({ error: 'Da dat toi da 8 nhan moi level' });

    const dupQuery = {
      email: req.user.email,
      name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
      $or: [{ isDefault: true }, { level }]
    };
    const dup = await Label.findOne(dupQuery);
    if (dup) return res.status(409).json({ error: 'Ten nhan da ton tai o level nay' });

    let id = 'lbl_' + Math.random().toString(36).slice(2, 8);
    while (await Label.findOne({ email: req.user.email, id })) {
      id = 'lbl_' + Math.random().toString(36).slice(2, 8);
    }

    const newLabel = await Label.create({
      email: req.user.email,
      id,
      name,
      color,
      level,
      order: count,
      isDefault: false
    });

    res.json({
      label: {
        id: newLabel.id,
        name: newLabel.name,
        color: newLabel.color,
        order: newLabel.order,
        isDefault: false,
        level: newLabel.level
      }
    });
  } catch (err) {
    console.error('POST /api/labels:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.put('/labels/:id', auth, async (req, res) => {
  try {
    let { name, color } = req.body;
    const label = await Label.findOne({ email: req.user.email, id: req.params.id });
    if (!label) return res.status(404).json({ error: 'Khong tim thay nhan' });

    if (name !== undefined) {
      name = name.trim();
      if (name.length === 0) return res.status(400).json({ error: 'Ten khong hop le' });
      if (name.length > 30) return res.status(400).json({ error: 'Ten qua dai' });
      const dup = await Label.findOne({
        email: req.user.email,
        id: { $ne: req.params.id },
        name: new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      });
      if (dup) return res.status(409).json({ error: 'Ten nhan da ton tai' });
      label.name = name;
    }
    if (color !== undefined) label.color = color;
    await label.save();
    res.json({
      label: {
        id: label.id,
        name: label.name,
        color: label.color,
        order: label.order,
        isDefault: label.isDefault
      }
    });
  } catch (err) {
    console.error('PUT /api/labels:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.delete('/labels/:id', auth, async (req, res) => {
  try {
    const label = await Label.findOne({ email: req.user.email, id: req.params.id });
    if (!label) return res.status(404).json({ error: 'Khong tim thay nhan' });
    if (label.isDefault) return res.status(400).json({ error: 'Khong the xoa nhan mac dinh' });

    await Label.deleteOne({ email: req.user.email, id: req.params.id });
    const allItems = await Item.find({ email: req.user.email });
    for (const it of allItems) {
      let changed = false;
      const newItems = {};
      for (const idx in it.items) {
        if (it.items[idx] !== req.params.id) newItems[idx] = it.items[idx];
        else changed = true;
      }
      if (changed) {
        it.items = newItems;
        it.markModified('items');
        await it.save();
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/labels:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.get('/items', auth, async (req, res) => {
  try {
    await ensureDefaultLabel(req.user.email);
    const level = normalizeLevel(req.query.level);
    if (!level) return res.json({ items: {} });
    const doc = await Item.findOne({ email: req.user.email, level });
    res.json({ items: doc ? (doc.items || {}) : {} });
  } catch (err) {
    console.error('GET /api/items:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/items', auth, async (req, res) => {
  try {
    let { level, items } = req.body;
    if (!level) return res.status(400).json({ error: 'Thieu level' });
    level = normalizeLevel(level);
    if (typeof items !== 'object' || items === null) {
      return res.status(400).json({ error: 'items phai la object' });
    }
    await ensureDefaultLabel(req.user.email);
    await Item.findOneAndUpdate(
      { email: req.user.email, level },
      { items },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/items:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.get('/level-data', auth, async (req, res) => {
  try {
    const level = normalizeLevel(req.query.level);
    if (!level) return res.status(400).json({ error: 'Thieu level' });

    await ensureDefaultLabel(req.user.email);

    const [labelsDoc, itemsDoc, starsDoc] = await Promise.all([
      Label.find({
        email: req.user.email,
        $or: [{ isDefault: true }, { level }]
      }).sort({ order: 1, createdAt: 1 }),
      Item.findOne({ email: req.user.email, level }),
      Star.findOne({ email: req.user.email, level })
    ]);

    res.json({
      labels: labelsDoc.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        order: l.order,
        isDefault: l.isDefault,
        level: l.level
      })),
      items: itemsDoc ? (itemsDoc.items || {}) : {},
      stars: starsDoc ? (starsDoc.stars || []) : []
    });
  } catch (err) {
    console.error('GET /api/level-data:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

module.exports = router;
