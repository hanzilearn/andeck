const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  email: { type: String, required: true },
  level: { type: mongoose.Schema.Types.Mixed, required: true },
  items: { type: mongoose.Schema.Types.Mixed, default: {} }
});
itemSchema.index({ email: 1, level: 1 }, { unique: true });

module.exports = mongoose.models.Item || mongoose.model('Item', itemSchema);
