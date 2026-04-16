const mongoose = require('mongoose');

const shiftBreakTimeSchema = new mongoose.Schema({
  shift: { type: String, enum: ['Morning', 'Afternoon'], required: true, unique: true },
  break_start_time: { type: String, required: true },
  break_end_time: { type: String, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ShiftBreakTime', shiftBreakTimeSchema);
