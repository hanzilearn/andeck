// server/config.js — biến môi trường & hằng số
module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'andeck_dev_secret_change_in_production',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/andeck',
  ROOT_DIR: require('path').join(__dirname, '..'),
  DEFAULT_DECK_QUOTA: 3,
  DEFAULT_WORD_QUOTA: 50
};
