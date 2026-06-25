// server/routes/auth.routes.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, DEFAULT_DECK_QUOTA, DEFAULT_WORD_QUOTA } = require('../config');
const User = require('../models/user');
const { auth } = require('../middleware/auth');
const { loginLimiter, registerLimiter, checkRateLimit } = require('../middleware/rate-limit');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', registerLimiter, async (req, res) => {
  try {
    let { email, password, confirmPassword } = req.body;
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();
    confirmPassword = (confirmPassword || '').trim();

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu nhập lại không khớp' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email đã được sử dụng' });

    await User.create({
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'user',
      type: 'user',
      deckQuota: DEFAULT_DECK_QUOTA,
      wordQuota: DEFAULT_WORD_QUOTA
    });

    res.json({ message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi hệ thống, vui lòng thử lại' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: 'Qua nhieu lan thu. Vui long doi 15 phut.' });
    }

    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Thieu thong tin' });

    const user = await User.findOne({ email: username });
    if (!user) return res.status(401).json({ error: 'Sai tai khoan hoac mat khau' });
    if (typeof user.passwordHash !== 'string') {
      return res.status(500).json({ error: 'Tai khoan loi, lien he admin' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Sai tai khoan hoac mat khau' });

    const token = jwt.sign(
      { email: user.email, role: user.role, type: user.type },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      email: user.email,
      role: user.role,
      type: user.type,
      deckQuota: user.deckQuota ?? DEFAULT_DECK_QUOTA,
      wordQuota: user.wordQuota ?? DEFAULT_WORD_QUOTA
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Loi he thong, vui long thu lai' });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Khong tim thay TK' });
  res.json({
    email: user.email,
    role: user.role,
    type: user.type,
    deckQuota: user.deckQuota ?? DEFAULT_DECK_QUOTA,
    wordQuota: user.wordQuota ?? DEFAULT_WORD_QUOTA,
    zalo: user.zalo || ''
  });
});

router.post('/change-password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'MK moi toi thieu 4 ky tu' });
  }
  const user = await User.findOne({ email: req.user.email });
  if (!user) return res.status(404).json({ error: 'Khong tim thay TK' });
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'MK hien tai khong dung' });
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Doi mat khau thanh cong!' });
});

module.exports = router;
