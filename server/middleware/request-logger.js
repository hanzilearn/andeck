// server/middleware/request-logger.js
function requestLogger(req, res, next) {
  if (req.url.startsWith('/api/')) {
    const start = Date.now();
    res.on('finish', function () {
      const time = Date.now() - start;
      const flag = res.statusCode >= 400 ? '❌' : '✓';
      console.log(`${flag} [${new Date().toISOString()}] ${req.method} ${req.url} → ${res.statusCode} (${time}ms)`);
    });
  }
  next();
}

module.exports = requestLogger;
