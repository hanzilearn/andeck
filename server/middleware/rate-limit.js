// server/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Quá nhiều lần thử đăng nhập. Vui lòng đợi 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Quá nhiều lần đăng ký. Vui lòng đợi 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false
});

const loginAttempts = {};

function checkRateLimit(ip) {
  const now = Date.now();
  if (!loginAttempts[ip]) loginAttempts[ip] = [];
  loginAttempts[ip] = loginAttempts[ip].filter((t) => now - t < 15 * 60 * 1000);
  if (loginAttempts[ip].length >= 10) return false;
  loginAttempts[ip].push(now);
  return true;
}

setInterval(() => { loginAttempts = {}; }, 30 * 60 * 1000);

module.exports = {
  loginLimiter,
  registerLimiter,
  checkRateLimit
};
