const mongoose = require('mongoose');

const labelSchema = new mongoose.Schema({
  email: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, required: true },
  level: { type: mongoose.Schema.Types.Mixed, default: null },
  order: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString().slice(0, 10) }
});
labelSchema.index({ email: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Label || mongoose.model('Label', labelSchema);
