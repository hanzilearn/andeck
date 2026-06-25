// server/services/labels.js
const Label = require('../models/label');
const Star = require('../models/star');
const Item = require('../models/item');

async function ensureDefaultLabel(email) {
  const hasLabel = await Label.findOne({ email, isDefault: true });
  if (hasLabel) return;
  await Label.create({
    email,
    id: 'lbl_default',
    name: 'Đã nhớ',
    color: '#f1c40f',
    order: 0,
    isDefault: true,
    level: null
  });
  const oldStars = await Star.find({ email });
  for (const s of oldStars) {
    const itemsMap = {};
    (s.stars || []).forEach((idx) => { itemsMap[idx] = 'lbl_default'; });
    await Item.findOneAndUpdate(
      { email, level: s.level },
      { items: itemsMap },
      { upsert: true }
    );
  }
}

module.exports = { ensureDefaultLabel };
