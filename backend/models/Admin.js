const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'sub_admin'],
    default: 'admin',
  },
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  phone: {
    type: String,
    trim: true,
  },
  pin: {
    type: String,
    trim: true,
  },
  profile_image: {
    type: String,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  is_delete: {
    type: Boolean,
    default: false,
  },
  resetPasswordOTP: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  fcmTokens: {
    type: [String],
    default: []
  },
}, {
  timestamps: true,
});

// Index for better query performance
adminSchema.index({ is_delete: 1 });

module.exports = mongoose.model('Admin', adminSchema);
