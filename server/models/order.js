// server/models/order.js — đơn mua gói (pending → verified → applied)
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, index: true },
  packageId: { type: String, required: true },
  packageName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'verified', 'applied'],
    default: 'pending',
    index: true
  },
  createdAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  appliedAt: { type: Date }
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
