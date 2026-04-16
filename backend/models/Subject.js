const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subject_code: {
    type: String,
    required: function() {
      // Require subject_code only for standards 10 and above
      const stdNum = Number(this.std);
      return stdNum >= 10;
    },
    trim: true,
    set: function(v) {
      if (typeof v !== 'string') return v;
      const t = v.trim();
      return t === '' ? undefined : t;
    },
  },
  subject_name: {
    type: String,
    required: true,
  },
  subject_level: {
    type: String,
    enum: ['Primary', 'Secondary', 'Higher Secondary'],
    required: true,
  },
  std: {
    type: String,
    required: true,
  },
  medium: {
    type: String,
    enum: ['English', 'Gujarati'],
    required: true,
    default: 'English',
  },
  stream: {
    type: String,
    enum: [
      'Science-Maths', 
      'Science-Bio', 
      'Commerce', 
      'Foundation',
      'Primary',
      'Upper Primary',
      'Secondary',
      'Higher Secondary'
    ],
    set: function(v) {
      if (typeof v !== 'string') return v;
      const t = v.trim();
      return t === '' ? undefined : t;
    },
  },
  is_delete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

subjectSchema.pre('validate', function(next) {
  if (!this.stream) {
    const map = {
      Primary: 'Primary',
      Secondary: 'Secondary',
      'Higher Secondary': 'Higher Secondary',
    };
    if (this.subject_level && map[this.subject_level]) {
      this.stream = map[this.subject_level];
    }
  }
  next();
});

// Compound partial index to ensure unique subject_code per medium when subject_code exists
subjectSchema.index(
  { subject_code: 1, medium: 1 },
  { unique: true, partialFilterExpression: { subject_code: { $exists: true, $ne: '' } } }
);

// Index for better query performance
subjectSchema.index({ std: 1, medium: 1 });
subjectSchema.index({ subject_name: 1 });

module.exports = mongoose.model('Subject', subjectSchema);