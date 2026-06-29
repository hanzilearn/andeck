// server/routes/orders.routes.js — gói & đơn hàng user
const express = require('express');
const Order = require('../models/order');
const User = require('../models/user');
const { auth } = require('../middleware/auth');
const { listPackages, getPackage } = require('../config/packages');
const { generateUniqueOrderCode } = require('../services/order-code');

const router = express.Router();

function serializeOrder(order) {
  return {
    id: order._id,
    orderCode: order.orderCode,
    packageId: order.packageId,
    packageName: order.packageName,
    amount: order.amount,
    priceLabel: order.amount.toLocaleString('vi-VN') + 'đ',
    email: order.email,
    status: order.status,
    createdAt: order.createdAt,
    verifiedAt: order.verifiedAt,
    appliedAt: order.appliedAt,
    refundedAt: order.refundedAt
  };
}

router.get('/packages', (req, res) => {
  res.json({ packages: listPackages() });
});

router.post('/orders', auth, async (req, res) => {
  try {
    const packageId = req.body?.packageId;
    const pkg = getPackage(packageId);
    if (!pkg) {
      return res.status(400).json({ error: 'Goi khong hop le' });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'Khong tim thay TK' });

    const existing = await Order.findOne({
      email: user.email,
      packageId: pkg.id,
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (existing) {
      return res.json({ order: serializeOrder(existing), reused: true });
    }

    const orderCode = await generateUniqueOrderCode();
    const order = await Order.create({
      orderCode,
      userId: user._id,
      email: user.email,
      packageId: pkg.id,
      packageName: pkg.name,
      amount: pkg.price,
      status: 'pending'
    });

    res.status(201).json({ order: serializeOrder(order), reused: false });
  } catch (err) {
    console.error('POST /api/orders:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.get('/orders/mine', auth, async (req, res) => {
  try {
    const orders = await Order.find({ email: req.user.email })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ orders: orders.map(serializeOrder) });
  } catch (err) {
    console.error('GET /api/orders/mine:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

module.exports = router;
