// server/routes/index.js
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const decksRoutes = require('./decks.routes');
const labelsRoutes = require('./labels.routes');
const starsRoutes = require('./stars.routes');
const ordersRoutes = require('./orders.routes');

function registerRoutes(app) {
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, app: 'andeck', version: '0.1.0' });
  });

  app.use('/api', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/decks', decksRoutes);
  app.use('/api', labelsRoutes);
  app.use('/api', starsRoutes);
  app.use('/api', ordersRoutes);
}

module.exports = registerRoutes;
