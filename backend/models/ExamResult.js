const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  gr_number: { type: String },
  class_code: { type: String },
  subject_code: { type: String },
  marks_obtained: { type: Number, required: true },
  revised_marks: { type: Number, default: null },
  total_marks: { type: Number, required: true },
  grade: { type: String },
  remarks: { type: String },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

examResultSchema.index({ exam_id: 1, student_id: 1 }, { unique: true });
module.exports = mongoose.model('ExamResult', examResultSchema);
