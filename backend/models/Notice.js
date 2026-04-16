const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  target_audience: { type: String, enum: ['All', 'Students', 'Teachers', 'Parents'], default: 'All' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  published_by: { type: String, required: true },
  publish_date: { type: Date, default: Date.now },
  expiry_date: { type: Date },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
