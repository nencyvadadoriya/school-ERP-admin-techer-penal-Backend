const Class = require('../models/Class');

// Create a new class
exports.createClass = async (req, res) => {
  try {
    const { standard, division, medium, stream, shift, subjects } = req.body;

    const existingClass = await Class.findOne({ standard, division, medium, is_delete: false });
    if (existingClass) {
      return res.status(400).json({ success: false, message: 'Class already exists' });
    }

    const newClass = new Class({ 
      standard, 
      division, 
      medium, 
      stream, 
      shift,
      subjects: subjects || [],
      class_code: `${standard}-${division}-${medium}` // Generate class_code
    });
    await newClass.save();

    res.status(201).json({ success: true, message: 'Class created successfully', data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all classes
exports.getAllClasses = async (req, res) => {
  try {
    const { standard, division, medium, stream, shift, is_active } = req.query;
    const filter = { is_delete: false };

    if (standard) filter.standard = standard;
    if (division) filter.division = division;
    if (medium) filter.medium = medium;
    if (stream) filter.stream = stream;
    if (shift) filter.shift = shift;
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const classes = await Class.find(filter).sort({ standard: 1, division: 1 });
    res.status(200).json({ success: true, count: classes.length, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// get class
exports.getClassById = async (req, res) => {
  try {
    const classData = await Class.findOne({ _id: req.params.id, is_delete: false });
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    res.status(200).json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get class by class_code (robust lookup)
exports.getClassByCode = async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (!code) return res.status(400).json({ success: false, message: 'class_code is required' });

    // Try exact match first
    let classData = await Class.findOne({ class_code: code, is_delete: false });
    if (classData) return res.status(200).json({ success: true, data: classData });

    // Fallback: load all classes and perform a normalized match (strip non-alphanumerics and compare lowercased)
    const all = await Class.find({ is_delete: false }).lean();
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = normalize(code);
    classData = all.find(c => normalize(c.class_code) === target || normalize(`${c.standard}${c.division}${c.medium}`) === target || normalize(`${c.standard}-${c.division}-${c.medium}`) === target);

    if (!classData) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, data: classData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update class
exports.updateClass = async (req, res) => {
  try {
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Class updated successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete class
exports.deleteClass = async (req, res) => {
  try {
    const deletedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { is_delete: true, is_active: false } },
      { new: true }
    );

    if (!deletedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign teacher to class
exports.assignTeacher = async (req, res) => {
  try {
    const { teacher_code } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { teacher_code } },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Ensure all students in this class have the correct class_code
    const Student = require('../models/Student');
    await Student.updateMany(
      { std: updatedClass.standard, division: updatedClass.division, is_delete: false },
      { $set: { class_code: updatedClass.class_code } }
    );

    // Also update the teacher's assigned_class array if it's not already there
    if (teacher_code) {
      const Teacher = require('../models/Teacher');
      await Teacher.findOneAndUpdate(
        { teacher_code, is_delete: false },
        { $addToSet: { assigned_class: updatedClass.class_code } }
      );
    }

    res.status(200).json({ success: true, message: 'Teacher assigned successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update class teacher (the primary one)
exports.updateClassTeacher = async (req, res) => {
  try {
    const { teacher_code, is_class_teacher } = req.body;
    
    // If setting as class teacher, we store teacher_code in Class model
    const updateData = is_class_teacher ? { teacher_code } : { teacher_code: null };
    
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: updateData },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Update Teacher's assigned_class array
    const Teacher = require('../models/Teacher');
    if (is_class_teacher && teacher_code) {
      // Add class_code to teacher's assigned_class if it doesn't exist
      await Teacher.findOneAndUpdate(
        { teacher_code, is_delete: false },
        { $addToSet: { assigned_class: updatedClass.class_code } }
      );
    } else {
      // Find the class code from the updatedClass object
      const classCode = updatedClass.class_code;
      // When unassigning, we should probably keep it in assigned_class 
      // but if the user wants strict class teacher logic, we could $pull
      // However, the request says "tik kre to wo class ka count show hoga"
      // implying the checkbox controls the visibility.
    }

    res.status(200).json({ success: true, message: 'Class teacher updated', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: Add subjects to class
exports.addSubjects = async (req, res) => {
  try {
    const { subjects } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { subjects: subjects } },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Subjects added successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: Add single subject to class
exports.addSingleSubject = async (req, res) => {
  try {
    const { subject } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $addToSet: { subjects: subject } }, // $addToSet prevents duplicates
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Subject added successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: Remove subject from class
exports.removeSubject = async (req, res) => {
  try {
    const { subject } = req.body;
    const updatedClass = await Class.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $pull: { subjects: subject } },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, message: 'Subject removed successfully', data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};