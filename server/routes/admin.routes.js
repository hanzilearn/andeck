// server/routes/admin.routes.js — skeleton (không HSK)
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Deck = require('../models/deck');
const Star = require('../models/star');
const Item = require('../models/item');
const { auth, adminOnly } = require('../middleware/auth');
const { DEFAULT_DECK_QUOTA, DEFAULT_WORD_QUOTA } = require('../config');
const { deckLevelKey } = require('../services/deck-ids');
const Order = require('../models/order');
const { getPackage } = require('../config/packages');
const { resolveTotalWordQuota } = require('../services/quota');

const router = express.Router();

router.get('/users', auth, adminOnly, async (req, res) => {
  const users = await User.find({}, '-passwordHash -__v');
  res.json(users.map((u) => {
    const o = u.toObject();
    o.deckQuota = u.deckQuota ?? DEFAULT_DECK_QUOTA;
    o.wordQuota = u.wordQuota ?? DEFAULT_WORD_QUOTA;
    o.totalWordQuota = resolveTotalWordQuota(u);
    return o;
  }));
});

router.post('/users', auth, adminOnly, async (req, res) => {
  const { email, password, deckQuota, wordQuota, zalo } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Thieu email hoac MK' });
  if (password.length < 4) return res.status(400).json({ error: 'MK toi thieu 4 ky tu' });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email da ton tai' });
  await User.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'user',
    type: 'user',
    deckQuota: deckQuota ?? DEFAULT_DECK_QUOTA,
    wordQuota: wordQuota ?? DEFAULT_WORD_QUOTA,
    totalWordQuota: (deckQuota ?? DEFAULT_DECK_QUOTA) * (wordQuota ?? DEFAULT_WORD_QUOTA),
    zalo: zalo || ''
  });
  res.json({ message: 'Tao TK "' + email + '" thanh cong!' });
});

router.put('/users/:email/reset-password', auth, adminOnly, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'MK toi thieu 4 ky tu' });
  }
  const user = await User.findOne({ email: decodeURIComponent(req.params.email) });
  if (!user) return res.status(404).json({ error: 'Khong tim thay TK' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Da dat lai MK' });
});

router.put('/users/:email/quota', auth, adminOnly, async (req, res) => {
  try {
    const { deckQuota, wordQuota, totalWordQuota } = req.body;
    const user = await User.findOne({ email: decodeURIComponent(req.params.email) });
    if (!user) return res.status(404).json({ error: 'Khong tim thay TK' });
    if (deckQuota !== undefined) user.deckQuota = parseInt(deckQuota, 10);
    if (wordQuota !== undefined) user.wordQuota = parseInt(wordQuota, 10);
    if (totalWordQuota !== undefined) {
      user.totalWordQuota = parseInt(totalWordQuota, 10);
    } else if (deckQuota !== undefined || wordQuota !== undefined) {
      user.totalWordQuota = user.deckQuota * user.wordQuota;
    }
    await user.save();
    res.json({
      ok: true,
      deckQuota: user.deckQuota,
      wordQuota: user.wordQuota,
      totalWordQuota: resolveTotalWordQuota(user)
    });
  } catch (err) {
    console.error('PUT /api/admin/users/:email/quota:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.delete('/users/:email', auth, adminOnly, async (req, res) => {
  const em = decodeURIComponent(req.params.email);
  const target = await User.findOne({ email: em });
  if (!target) return res.status(404).json({ error: 'Khong tim thay TK' });
  if (target.role === 'admin') return res.status(400).json({ error: 'Khong the xoa admin' });
  await User.deleteOne({ email: em });
  res.json({ message: 'Da xoa "' + em + '"' });
});

router.get('/users/:email/decks', auth, adminOnly, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const decks = await Deck.aggregate([
      { $match: { email } },
      {
        $project: {
          _id: 0,
          deckId: 1,
          name: 1,
          langPair: 1,
          createdAt: 1,
          wordCount: { $size: { $ifNull: ['$words', []] } }
        }
      }
    ]);
    res.json(decks);
  } catch (err) {
    console.error('GET /api/admin/users/:email/decks:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.delete('/decks/:deckId', auth, adminOnly, async (req, res) => {
  try {
    const deck = await Deck.findOne({ deckId: req.params.deckId });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });
    await Deck.deleteOne({ deckId: req.params.deckId });
    const levelKey = deckLevelKey(req.params.deckId);
    await Star.deleteMany({ email: deck.email, level: levelKey });
    await Item.deleteMany({ email: deck.email, level: levelKey });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/decks/:deckId:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

function serializeAdminOrder(order) {
  return {
    id: order._id,
    orderCode: order.orderCode,
    email: order.email,
    packageId: order.packageId,
    packageName: order.packageName,
    amount: order.amount,
    priceLabel: order.amount.toLocaleString('vi-VN') + 'đ',
    status: order.status,
    createdAt: order.createdAt,
    verifiedAt: order.verifiedAt,
    appliedAt: order.appliedAt,
    refundedAt: order.refundedAt
  };
}

function orderStatusFilter(status) {
  if (status === 'all') return {};
  if (status === 'processed') return { status: { $in: ['applied', 'refunded'] } };
  return { status };
}

router.get('/orders', auth, adminOnly, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const filter = orderStatusFilter(status);
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ orders: orders.map(serializeAdminOrder) });
  } catch (err) {
    console.error('GET /api/admin/orders:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/orders/:id/verify', auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Khong tim thay don' });
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Don da xu ly (trang thai: ' + order.status + ')' });
    }

    const pkg = getPackage(order.packageId);
    if (!pkg) return res.status(400).json({ error: 'Goi khong hop le' });

    const user = await User.findOne({ email: order.email });
    if (!user) return res.status(404).json({ error: 'Khong tim thay user' });

    user.deckQuota = (user.deckQuota ?? DEFAULT_DECK_QUOTA) + pkg.deckAdd;
    const currentTotal = resolveTotalWordQuota(user);
    user.totalWordQuota = currentTotal + pkg.wordAdd;
    user.wordQuota = user.totalWordQuota;
    await user.save();

    const now = new Date();
    order.status = 'applied';
    order.verifiedAt = now;
    order.appliedAt = now;
    await order.save();

    res.json({
      ok: true,
      order: serializeAdminOrder(order),
      user: {
        email: user.email,
        deckQuota: user.deckQuota,
        wordQuota: user.wordQuota,
        totalWordQuota: user.totalWordQuota
      }
    });
  } catch (err) {
    console.error('POST /api/admin/orders/:id/verify:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/orders/:id/refund', auth, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Khong tim thay don' });
    if (order.status !== 'applied') {
      return res.status(400).json({ error: 'Chi hoan tra don da kich hoat' });
    }

    const pkg = getPackage(order.packageId);
    if (!pkg) return res.status(400).json({ error: 'Goi khong hop le' });

    const user = await User.findOne({ email: order.email });
    if (!user) return res.status(404).json({ error: 'Khong tim thay user' });

    const minTotal = DEFAULT_DECK_QUOTA * DEFAULT_WORD_QUOTA;
    user.deckQuota = Math.max(DEFAULT_DECK_QUOTA, (user.deckQuota ?? DEFAULT_DECK_QUOTA) - pkg.deckAdd);
    user.totalWordQuota = Math.max(minTotal, resolveTotalWordQuota(user) - pkg.wordAdd);
    user.wordQuota = user.totalWordQuota;
    await user.save();

    order.status = 'refunded';
    order.refundedAt = new Date();
    await order.save();

    res.json({
      ok: true,
      order: serializeAdminOrder(order),
      user: {
        email: user.email,
        deckQuota: user.deckQuota,
        wordQuota: user.wordQuota,
        totalWordQuota: user.totalWordQuota
      }
    });
  } catch (err) {
    console.error('POST /api/admin/orders/:id/refund:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

module.exports = router;
