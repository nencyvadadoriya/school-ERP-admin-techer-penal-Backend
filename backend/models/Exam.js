const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  exam_name: { type: String, required: true },
  medium: { type: String, enum: ['Gujarati', 'English'], required: true },
  class_code: { type: String, required: true, trim: true },
  subject_code: { type: String, required: true, trim: true },
  teacher_code: { type: String, trim: true },
  exam_date: { type: Date, required: true },
  start_time: { type: String, trim: true },
  end_time: { type: String, trim: true },
  total_marks: { type: Number, required: true, default: 100 },
  passing_marks: { type: Number, default: 35 },
  exam_type: { type: String, enum: ['Unit Test', 'Mid Term', 'Final', 'Practical', 'Assignment'], default: 'Unit Test' },
  description: { type: String },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

examSchema.index({ class_code: 1, exam_date: 1 });
module.exports = mongoose.model('Exam', examSchema);
