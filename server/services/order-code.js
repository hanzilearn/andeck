// server/services/order-code.js — mã đơn AD-YYYYMMDD-XXXX
const Order = require('../models/order');

function randomSuffix(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function formatOrderCode(date, suffix) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return 'AD-' + y + m + d + '-' + suffix;
}

async function generateUniqueOrderCode() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = formatOrderCode(new Date(), randomSuffix(4));
    const exists = await Order.exists({ orderCode: code });
    if (!exists) return code;
  }
  throw new Error('Khong tao duoc ma don');
}

module.exports = { generateUniqueOrderCode, formatOrderCode };
