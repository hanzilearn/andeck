const mongoose = require('mongoose');

const starSchema = new mongoose.Schema({
  email: { type: String, required: true },
  level: { type: mongoose.Schema.Types.Mixed, required: true },
  stars: { type: [Number], default: [] }
});
starSchema.index({ email: 1, level: 1 }, { unique: true });

module.exports = mongoose.models.Star || mongoose.model('Star', starSchema);
