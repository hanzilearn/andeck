// server/index.js — bootstrap Andeck
const mongoose = require('mongoose');
const { PORT, MONGO_URI } = require('./config');
const createApp = require('./create-app');
const { ensureDefaults } = require('./db/seed');

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const app = createApp();

app.listen(PORT, () => {
  console.log('\n📚 Andeck Server v0.1');
  console.log('📍 Web:   http://localhost:' + PORT);
  console.log('📍 Admin: http://localhost:' + PORT + '/admin.html\n');
});

mongoose.connect(MONGO_URI).then(async () => {
  console.log('✅ Đã kết nối MongoDB');
  await ensureDefaults();
}).catch((err) => {
  console.error('⚠️  MongoDB chưa kết nối:', err.message);
  console.error('   → Server vẫn chạy; auth/lưu deck sẽ hoạt động sau khi MongoDB sẵn sàng.');
});
