const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  gr_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  std: {
    type: String,
    required: [true, 'Standard is required'],
  },
  roll_no: {
    type: String,
    trim: true,
  },
  first_name: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  middle_name: {
    type: String,
    trim: true,
  },
  last_name: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
  },
  phone1: {
    type: String,
    trim: true,
  },
  phone2: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
  },
  pin: {
    type: String,
    trim: true,
  },
  class_name: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    trim: true,
  },
  division: {
    type: String,
    trim: true,
  },
  class_code: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  profile_image: {
    type: String,
  },
  fees: {
    type: Number,
    default: 0,
  },
  shift: {
    type: String,
    enum: ['Morning', 'Afternoon'],
  },
  medium: {
    type: String,
    enum: ['English', 'Gujarati', 'Hindi'],
    required: [true, 'Medium is required'],
  },
  stream: {
    type: String,
    enum: ['Science-Maths', 'Science-Bio', 'Commerce', 'Foundation', 'Primary', 'Upper Primary', 'Secondary', 'Higher Secondary'],
  },
  is_delete: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  pushSubscription: {
    type: Object,
    default: null
  },
  fcmTokens: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
});

// Indexes
studentSchema.index({ class_code: 1 });
studentSchema.index({ is_delete: 1 });
studentSchema.index(
  { std: 1, class_name: 1, roll_no: 1 },
  {
    unique: true,
    partialFilterExpression: { is_delete: false },
  }
);

module.exports = mongoose.model('Student', studentSchema);
