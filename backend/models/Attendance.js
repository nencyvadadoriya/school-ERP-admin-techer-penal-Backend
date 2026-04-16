const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  class_code: { type: String, required: true, ref: 'Class' },
  subject_code: { type: String, ref: 'Subject' },
  teacher_code: { type: String, ref: 'Teacher' },
  date: { type: Date, required: true },
  records: [
    {
      student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
      gr_number: { type: String },
      status: { type: String, enum: ['Present', 'Absent', 'Late', 'Excused'], default: 'Present' },
    },
  ],
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

attendanceSchema.index({ class_code: 1, date: 1 });
module.exports = mongoose.model('Attendance', attendanceSchema);
