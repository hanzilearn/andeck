// server/middleware/auth.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const User = require('../models/user');

async function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Chua dang nhap' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select('email role type deckQuota wordQuota');
    if (!user) return res.status(401).json({ error: 'Token het han' });
    req.user = {
      email: user.email,
      role: user.role || decoded.role,
      type: user.type || decoded.type,
      deckQuota: user.deckQuota,
      wordQuota: user.wordQuota
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token het han' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Khong co quyen' });
  next();
}

module.exports = { auth, adminOnly };
