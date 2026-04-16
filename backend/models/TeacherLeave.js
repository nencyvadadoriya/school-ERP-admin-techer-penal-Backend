const mongoose = require('mongoose');

const teacherLeaveSchema = new mongoose.Schema({
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  teacher_code: { type: String, required: true },
  teacher_name: { type: String },
  leave_type: { type: String, enum: ['Sick', 'Personal', 'Family', 'Emergency', 'Casual', 'Other'], default: 'Casual' },
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

module.exports = mongoose.model('TeacherLeave', teacherLeaveSchema);
