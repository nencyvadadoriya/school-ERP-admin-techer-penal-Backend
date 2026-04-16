const mongoose = require('mongoose');

const feesSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  gr_number: { type: String, required: true },
  std: { type: String },
  division: { type: String },
  class_code: { type: String },
  shift: { type: String, enum: ['Morning', 'Afternoon'] },
  medium: { type: String, enum: ['English', 'Gujarati', 'Hindi'] },
  stream: {
    type: String,
    enum: ['Science-Maths', 'Science-Bio', 'Commerce', 'Foundation', 'Primary', 'Upper Primary', 'Secondary', 'Higher Secondary'],
  },
  fee_type: { type: String, enum: ['Tuition', 'Transport', 'Library', 'Lab', 'Sports', 'Other'], default: 'Tuition' },
  total_amount: { type: Number, required: true },
  amount_paid: { type: Number, default: 0 },
  due_date: { type: Date, required: true },
  paid_date: { type: Date },
  payment_mode: { type: String, enum: ['Cash', 'Online', 'Cheque', 'DD'], default: 'Cash' },
  receipt_number: { type: String },
  academic_year: { type: String },
  installment_number: { type: Number, default: 1 },
  status: { type: String, enum: ['Pending', 'Paid', 'Partial', 'Overdue'], default: 'Pending' },
  remarks: { type: String },
  is_delete: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

feesSchema.index({ gr_number: 1, academic_year: 1 });
module.exports = mongoose.model('Fees', feesSchema);
