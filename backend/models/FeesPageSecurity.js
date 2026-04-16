const mongoose = require('mongoose');

const feesPageSecuritySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  resetCodeHash: { type: String },
  resetCodeExpiresAt: { type: Date },
  lastChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('FeesPageSecurity', feesPageSecuritySchema);
