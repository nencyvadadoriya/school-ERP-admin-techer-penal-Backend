const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  class_code: { type: String, required: true },
  subject_code: { type: String, required: true },
  teacher_code: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  due_date: { type: Date, required: true },
  assigned_date: { type: Date, default: Date.now },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

homeworkSchema.index({ class_code: 1, due_date: 1 });
module.exports = mongoose.model('Homework', homeworkSchema);
