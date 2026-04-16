const mongoose = require('mongoose');

const studentLeaveSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  gr_number: { type: String, required: true },
  student_name: { type: String },
  class_code: { type: String },
  leave_type: { type: String, enum: ['Sick', 'Personal', 'Family', 'Emergency', 'Other'], default: 'Personal' },
  from_date: { type: Date, required: true },
  to_date: { type: Date, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approved_by: { type: String },
  remarks: { type: String },
  rejection_reason: { type: String },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('StudentLeave', studentLeaveSchema);
