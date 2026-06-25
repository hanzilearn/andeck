// server/create-app.js — khởi tạo Express app
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const { ROOT_DIR } = require('./config');
const requestLogger = require('./middleware/request-logger');
const registerRoutes = require('./routes');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.set('trust proxy', 1);
  app.use(express.static(path.join(ROOT_DIR, 'public')));
  app.use(requestLogger);
  registerRoutes(app);
  return app;
}

module.exports = createApp;
