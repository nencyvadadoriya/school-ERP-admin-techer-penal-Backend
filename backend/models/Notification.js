const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  recipient_type: { type: String, enum: ['All', 'Teacher', 'Student', 'Class'], required: true },
  recipient_id: { type: String }, // For specific Teacher/Student/Class code
  is_read: { type: Boolean, default: false },
  is_delete: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
