const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  teacher_code: {
    type: String,
    required: false,
    unique: true,
    trim: true,
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
  phone: {
    type: String,
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
  pin: {
    type: String,
    trim: true,
  },
  profile_image: {
    type: String,
  },
  experience: {
    type: Number,
    default: 0,
  },
  about: {
    type: String,
  },
  medium: {
    type: String,
    trim: true,
  },
  assigned_class: {
    type: [String],
    default: [],
  },
  subjects: {
    type: [String],
    default: [],
  },
  subject_assignments: [{
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    subject_name: String,
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    class_name: String,
    medium: String,
  }],
  is_delete: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  resetPasswordOTP: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
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

// Auto-generate teacher_code before saving
teacherSchema.pre('save', async function(next) {
  // Only generate if teacher_code is not provided or is empty
  if (!this.teacher_code || this.teacher_code.trim() === '') {
    try {
      // Find the last teacher code
      const lastTeacher = await this.constructor
        .findOne({ teacher_code: { $regex: /^TCH\d+$/ } })
        .sort({ teacher_code: -1 })
        .select('teacher_code')
        .lean();

      let newNumber = 1001; // Starting number

      if (lastTeacher && lastTeacher.teacher_code) {
        // Extract number from teacher_code (e.g., "TCH1001" -> 1001)
        const lastNumber = parseInt(lastTeacher.teacher_code.replace('TCH', ''));
        if (!isNaN(lastNumber)) {
          newNumber = lastNumber + 1;
        }
      }

      // Generate new teacher code
      this.teacher_code = `TCH${newNumber}`;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Indexes
teacherSchema.index({ teacher_code: 1 });
teacherSchema.index({ is_delete: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);