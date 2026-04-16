const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  event_date: { type: Date, required: true },
  end_date: { type: Date },
  location: { type: String },
  event_type: { type: String, enum: ['Academic', 'Sports', 'Cultural', 'Holiday', 'Meeting', 'Other'], default: 'Academic' },
  organized_by: { type: String },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
