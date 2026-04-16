const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  standard: {
    type: String,
    required: true,
  },
  division: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D'],
  },
  medium: {
    type: String,
    required: true,
    enum: ['Gujarati', 'English'],
  },
  stream: {
    type: String,
    enum: {
      values: ['Science-Maths', 'Science-Bio', 'Commerce', 'Primary', 'Upper Primary', 'Secondary', 'Higher Secondary', ''],
      message: '{VALUE} is not a valid stream'
    },
    default: ''
  },
  shift: {
    type: String,
    enum: ['Morning', 'Afternoon'],
  },
  // ✅ ADD SUBJECTS FIELD HERE
  subjects: {
    type: [String],  // Array of subjects
    default: []      // Default empty array
  },
  time_table_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeTable',
  },
  is_delete: {
    type: Boolean,
    default: false,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  teacher_code: {
    type: String,
    trim: true,
  },
  class_code: {
    type: String,
    unique: true,
    trim: true,
  },
}, {
  timestamps: true,
});

// Optional: Add a virtual field for class name
classSchema.virtual('class_name').get(function() {
  return `${this.standard} ${this.division} (${this.medium})`;
});

// Optional: Add indexes for better query performance
classSchema.index({ standard: 1, division: 1, medium: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);