const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  period_number: { type: Number },
  start_time: { type: String },
  end_time: { type: String },
  subject_code: { type: String },
  subject_name: { type: String },
  teacher_code: { type: String },
  teacher_name: { type: String },
});

const dayScheduleSchema = new mongoose.Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  day_start_time: { type: String },
  day_end_time: { type: String },
  break_start_time: { type: String },
  break_end_time: { type: String },
  periods: [periodSchema],
});

const timeTableSchema = new mongoose.Schema({
  class_code: { type: String, required: true, unique: true },
  academic_year: { type: String },
  schedule: [dayScheduleSchema],
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

timeTableSchema.index({ class_code: 1, 'schedule.day': 1, 'schedule.periods.period_number': 1 });

module.exports = mongoose.model('TimeTable', timeTableSchema);
