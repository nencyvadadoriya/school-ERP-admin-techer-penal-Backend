const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const { uploadToCloudinary } = require('../config/cloudinary');

// Generate GR Number
const generateGRNumber = async () => {
  const count = await Student.countDocuments();
  const year = new Date().getFullYear();
  return `GR${year}${String(count + 1).padStart(5, '0')}`;
};

const getMaxRollNo = async ({ std, class_name, medium, shift }) => {
  const filter = {
    std: String(std),
    class_name: String(class_name),
    is_delete: false,
  };

  if (medium) filter.medium = String(medium);
  if (shift) filter.shift = String(shift);

  const rows = await Student.aggregate([
    {
      $match: filter,
    },
    {
      $project: {
        rollNoInt: {
          $convert: {
            input: '$roll_no',
            to: 'int',
            onError: 0,
            onNull: 0,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        maxRoll: { $max: '$rollNoInt' },
      },
    },
  ]);

  return rows && rows[0] && typeof rows[0].maxRoll === 'number' ? rows[0].maxRoll : 0;
};

// Get Next Roll Number
const getNextRollNumber = async (req, res) => {
  try {
    const { std, class_name, shift, medium, stream } = req.query;
    
    if (!std || !class_name) {
      return res.status(400).json({ success: false, message: 'std and class_name are required' });
    }

    const maxRoll = await getMaxRollNo({ std, class_name, medium, shift });
    const nextRollNo = maxRoll + 1;

    res.json({
      success: true,
      nextRollNo: String(nextRollNo)
    });
  } catch (error) {
    console.error('Error in getNextRollNumber:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register Student
const registerStudent = async (req, res) => {
  try {
    const {
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      class_name,
      password,
      fees,
      shift,
      medium,
      stream,
    } = req.body;


    // Generate GR number
    const gr_number = await generateGRNumber();

    // Auto-calculate next roll number for the class (standard + division + medium + shift)
    const maxRoll = await getMaxRollNo({ std, class_name, medium, shift });
    const nextRollNo = maxRoll + 1;

    // Ensure password exists; if not provided, default to 123456
    let plainPassword = password;
    if (!plainPassword) {
      plainPassword = '123456';
    }

    // Default pin to 1234 if not provided
    const studentPin = pin || '1234';

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      profileImageUrl = uploadResult.url;
    }

    // Generate class_code: std + division (class_name) + medium
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedClassCode = normalize(`${std}-${class_name || 'A'}-${medium || 'English'}`);

    // Create student
    const student = await Student.create({
      gr_number,
      std,
      roll_no: String(nextRollNo),
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin: studentPin,
      class_name,
      division: class_name || 'A',
      class_code: normalize(class_code) || generatedClassCode,
      password: hashedPassword,
      profile_image: profileImageUrl,
      fees: fees || 0,
      shift,
      medium: medium || 'English',
      stream,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, gr_number: student.gr_number, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    const responsePayload = {
      success: true,
      message: 'Student registered successfully',
      data: studentResponse,
      token,
    };

    if (!password) {
      responsePayload.generated_password = plainPassword;
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error in registerStudent:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error.code === 11000) {
      const dupKey = Object.keys(error.keyValue || {}).join(', ');
      return res.status(400).json({ success: false, message: `Duplicate value for field(s): ${dupKey}` });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message,
    });
  }
};

const bulkCreateStudents = async (req, res) => {
  try {
    const { classId, medium, std, class_code, shift, stream, default_password, students } = req.body;
    
    console.log('Bulk Create Request Body:', JSON.stringify(req.body, null, 2));

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'students array is required' });
    }

    const year = new Date().getFullYear();
    const baseCount = await Student.countDocuments();

    const errors = [];
    const docs = [];
    const generatedCredentials = [];
    const inputIndexByDocIndex = [];

    // Fetch all classes to find matching class_code based on std
    const allClasses = await Class.find({ is_delete: false }).lean();

    // Get the max roll numbers for each class to auto-increment
    const classMaxRollNumbers = {};

    for (let i = 0; i < students.length; i++) {
      const row = students[i] || {};
      const first_name = typeof row.first_name === 'string' ? row.first_name.trim() : row.first_name;
      const middle_name = typeof row.middle_name === 'string' ? row.middle_name.trim() : row.middle_name;
      const last_name = typeof row.last_name === 'string' ? row.last_name.trim() : row.last_name;
      
      const rowStd = row.std || std;
      const rowMedium = row.medium || medium;
      let rowClassName = row.class_name || '';

      if (!first_name) {
        errors.push({ index: i, message: 'first_name is required' });
        continue;
      }
      if (!last_name) {
        errors.push({ index: i, message: 'last_name is required' });
        continue;
      }
      if (!rowStd) {
        errors.push({ index: i, message: 'std is required' });
        continue;
      }

      // Try to find a matching class for this student's standard AND division (class_name)
      const matchingClass = allClasses.find(c => 
        String(c.standard) === String(rowStd) && 
        String(c.division || '').toUpperCase() === String(rowClassName).toUpperCase()
      );
      
      const rowShift = row.shift || shift || matchingClass?.shift || 'Morning';
      const rowStream = row.stream || stream || matchingClass?.stream || 'Primary';

      // Determine Roll Number (Unique for Standard + Division + Medium + Shift)
      const classKey = `${rowStd}-${rowClassName}-${rowMedium}-${rowShift}`;
      if (!classMaxRollNumbers[classKey]) {
        const maxRoll = await getMaxRollNo({ 
          std: rowStd, 
          class_name: rowClassName,
          medium: rowMedium,
          shift: rowShift
        });
        classMaxRollNumbers[classKey] = maxRoll;
      }
      classMaxRollNumbers[classKey] += 1;
      const roll_no = String(classMaxRollNumbers[classKey]);

      // Generate class_code: std + division (rowClassName) + medium
      const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const generatedClassCode = normalize(`${rowStd}-${rowClassName || 'A'}-${rowMedium || 'English'}`);

      const gr_number = `GR${year}${String(baseCount + docs.length + 1).padStart(5, '0')}`;

      let plainPassword = row.password || default_password || '123456';
      const studentPin = row.pin || '1234';

      const hashedPassword = await bcrypt.hash(String(plainPassword), 10);

      inputIndexByDocIndex.push(i);
      docs.push({
        gr_number,
        std: String(rowStd),
        roll_no: String(roll_no || '').trim(),
        first_name,
        middle_name,
        last_name,
        gender: row.gender || 'Other',
        phone1: row.phone1,
        phone2: row.phone2,
        address: row.address,
        pin: studentPin,
        class_name: row.class_name,
        division: row.class_name || 'A',
        class_code: generatedClassCode,
        medium: rowMedium || matchingClass?.medium || 'English',
        password: hashedPassword,
        profile_image: null,
        fees: typeof row.fees !== 'undefined' ? Number(row.fees) : (matchingClass?.fees || 0),
        shift: rowShift,
        stream: rowStream,
      });
    }

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid students to create', errors });
    }

    let created = [];
    try {
      created = await Student.insertMany(docs, { ordered: false });
    } catch (error) {
      if (error?.writeErrors && Array.isArray(error.writeErrors)) {
        error.writeErrors.forEach((we) => {
          const inputIndex = typeof we.index === 'number' ? (inputIndexByDocIndex[we.index] ?? we.index) : we.index;
          errors.push({
            index: inputIndex,
            message: we?.errmsg || we?.error?.message || 'Duplicate value / validation failed',
          });
        });
        created = error.insertedDocs || [];
      } else {
        throw error;
      }
    }

    const createdSanitized = created.map((s) => {
      const obj = s.toObject ? s.toObject() : s;
      if (obj && obj.password) delete obj.password;
      return obj;
    });

    return res.status(201).json({
      success: true,
      message: 'Bulk students created',
      count: createdSanitized.length,
      data: createdSanitized,
      errors,
      generated_credentials: generatedCredentials,
    });
  } catch (error) {
    console.error('Error in bulkCreateStudents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login Student
const loginStudent = async (req, res) => {
  try {
    const { gr_number, password, pin } = req.body;

    // Find student
    const student = await Student.findOne({ gr_number, is_delete: false });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: 'GR number not match',
      });
    }

    // Check if account is active
    if (!student.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
      });
    }

    // Verify password or pin
    let isValid = false;
    if (password) {
      isValid = await bcrypt.compare(password, student.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Password not match',
        });
      }
    } else if (pin) {
      // Ensure both are compared as strings
      isValid = String(pin) === String(student.pin);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'PIN not match',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Password or PIN required',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: student._id, gr_number: student.gr_number, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: studentResponse,
      token,
    });
  } catch (error) {
    console.error('Error in loginStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Change Password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    student.password = hashedPassword;
    await student.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ success: false, message: 'Error updating password', error: error.message });
  }
};

// Change PIN
const changePin = async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const studentId = req.user.id;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (String(currentPin) !== String(student.pin)) {
      return res.status(400).json({ success: false, message: 'Current PIN does not match' });
    }

    student.pin = String(newPin);
    await student.save();

    res.json({ success: true, message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Error in changePin:', error);
    res.status(500).json({ success: false, message: 'Error updating PIN', error: error.message });
  }
};

// Get All Students
const getAllStudents = async (req, res) => {
  try {
    const { class_code, std, shift, medium } = req.query;
    const filter = { is_delete: false };

    if (std) filter.std = String(std);
    if (shift) filter.shift = String(shift);
    if (medium) filter.medium = String(medium);

    // Role-aware filtering:
    // - admin: can see all students (optionally by class_code)
    // - teacher: can only see students of classes where they are the primary class teacher (Class.teacher_code)
    const role = req.user?.role;
    console.log('getAllStudents request:', { role, class_code, user: req.user });
    if (role === 'teacher') {
      // Strict: only classes where teacher_code matches in Class collection
      const classTeacherDocs = await Class.find({ teacher_code: req.user?.teacher_code, is_delete: false })
        .select('class_code')
        .lean();
      const allowedClasses = (classTeacherDocs || []).map((c) => c?.class_code).filter(Boolean);

      if (allowedClasses.length === 0) {
        console.log('Teacher has no assigned classes');
        return res.json({ success: true, count: 0, data: [] });
      }

      const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const assignedNormalized = allowedClasses.map(normalize);

      // Only allow teacher to query within their own assigned classes
      if (class_code) {
        const requested = String(class_code);
        const requestedNormalized = normalize(requested);
        
        const isAuthorized = assignedNormalized.includes(requestedNormalized) ||
          allowedClasses.includes(requested) ||
          allowedClasses.some(a => {
            const normalizedA = normalize(a);
            return normalizedA.includes(requestedNormalized) || requestedNormalized.includes(normalizedA);
          });

        if (!isAuthorized) {
          console.log(`Teacher not authorized for class ${requested}. Allowed:`, allowedClasses);
          return res.json({ success: true, count: 0, data: [] });
        }
        
        // Find students with normalized class_code OR matching components
        const allStudents = await Student.find({ is_delete: false, is_active: true }).select('-password').lean();
        
        let requestedStd = '';
        let requestedDiv = '';
        
        const stdMatch = requested.match(/(\d+)/);
        if (stdMatch) requestedStd = stdMatch[1];
        
        const divMatch = requested.match(/Div\s*([A-D])/i) || requested.match(/-([A-D])\b/i) || requested.match(/\s+([A-D])\s+/i) || requested.match(/\s+([A-D])$/i);
        if (divMatch) requestedDiv = divMatch[1];

        const students = allStudents.filter(s => {
          const sc = normalize(s.class_code);
          const rc = normalize(requested);
          // 1. Exact or normalized match
          if (sc === rc || s.class_code === requested) return true;

          // 2. Component matching (Standard & Division)
          const sStd = normalize(String(s.std || s.standard || ''));
          const sDiv = normalize(String(s.class_name || s.division || ''));
          const rStd = normalize(requestedStd);
          const rDiv = normalize(requestedDiv);
          
          if (rStd && rDiv && sStd === rStd && sDiv === rDiv) return true;

          // 3. Fallback: Substring matching
          if (sc && rc && (sc.includes(rc) || rc.includes(sc))) return true;

          return false;
        });

        return res.json({
          success: true,
          count: students.length,
          data: students,
        });
      } else {
        filter.class_code = { $in: allowedClasses };
      }
    } else {
      // default/admin behavior
      if (class_code) filter.class_code = String(class_code);
    }

    const students = await Student.find(filter)
      .select('-password')
      .sort({ roll_no: 1, createdAt: 1 });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// Get Single Student
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ _id: id, is_delete: false }).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    let classDetails = null;
    if (student?.class_code) {
      const studentClassCode = String(student.class_code).trim();

      // 1) Exact match
      classDetails = await Class.findOne({ class_code: studentClassCode, is_delete: false })
        .select('class_code standard division medium shift stream')
        .lean();

      // 2) If student stores only short code like "1-A", try matching any class starting with "1-A-"
      if (!classDetails) {
        const m = studentClassCode.match(/^(\d+)\s*-?\s*([A-Za-z])\b/);
        if (m) {
          const std = String(m[1]);
          const div = String(m[2]).toUpperCase();
          classDetails = await Class.findOne({ standard: std, division: div, is_delete: false })
            .select('class_code standard division medium shift stream')
            .lean();
        }
      }

      // 3) Final fallback: normalized compare against all classes
      if (!classDetails) {
        const all = await Class.find({ is_delete: false })
          .select('class_code standard division medium shift stream')
          .lean();
        const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(studentClassCode);
        classDetails = all.find((c) => normalize(c.class_code) === target) || null;
      }
    }

    const payload = student.toObject ? student.toObject() : student;
    if (classDetails) {
      payload.class_details = classDetails;
      if (!payload.shift && classDetails.shift) payload.shift = classDetails.shift;
      if (!payload.stream && classDetails.stream) payload.stream = classDetails.stream;
    }

    res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message,
    });
  }
};

// Update Student
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      std,
      roll_no,
      first_name,
      middle_name,
      last_name,
      gender,
      phone1,
      phone2,
      address,
      pin,
      class_code,
      class_name,
      fees,
      shift,
      medium,
      stream,
      is_active,
      remove_profile_image,
    } = req.body;

    // Check if student exists
    const student = await Student.findOne({ _id: id, is_delete: false });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Handle profile image removal
    if (remove_profile_image === true || remove_profile_image === 'true') {
      student.profile_image = null;
    }

    // Handle profile image upload
    let profileImageUrl = student.profile_image;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      profileImageUrl = uploadResult.url;
    }

    // Generate class_code: std + division (class_name) + medium
    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedClassCode = std && class_name ? normalize(`${std}-${class_name || 'A'}-${medium || 'English'}`) : student.class_code;

    // Update student
    if (std) student.std = std;
    if (roll_no) student.roll_no = roll_no;
    if (first_name) student.first_name = first_name;
    if (middle_name) student.middle_name = middle_name;
    if (last_name) student.last_name = last_name;
    if (gender) student.gender = gender;
    if (phone1) student.phone1 = phone1;
    if (phone2) student.phone2 = phone2;
    if (address) student.address = address;
    if (pin) student.pin = pin;
    if (class_code || (std && class_name)) {
      student.class_code = class_code ? normalize(class_code) : generatedClassCode;
    }
    if (class_name) {
      student.class_name = class_name;
      student.division = class_name || 'A';
    }
    student.profile_image = profileImageUrl;
    if (typeof fees !== 'undefined') student.fees = fees;
    if (shift) student.shift = shift;
    if (medium) student.medium = medium || 'English';
    if (stream) student.stream = stream;
    if (typeof is_active !== 'undefined') student.is_active = is_active;

    await student.save();

    // Remove password from response
    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: studentResponse,
    });
  } catch (error) {
    console.error('Error in updateStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating student',
      error: error.message,
    });
  }
};

// Delete Student (Soft Delete)
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student exists
    const student = await Student.findOne({ _id: id, is_delete: false });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Soft delete
    student.is_delete = true;
    await student.save();

    res.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting student',
      error: error.message,
    });
  }
};

// Update Profile Image (For Student themselves)
const updateProfileImage = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { remove_profile_image } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Handle removal
    if (remove_profile_image === true || remove_profile_image === 'true') {
      student.profile_image = null;
    }

    // Handle upload
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/students');
      student.profile_image = uploadResult.url;
    }

    await student.save();

    const studentResponse = student.toObject();
    delete studentResponse.password;

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: studentResponse,
    });
  } catch (error) {
    console.error('Error in updateProfileImage:', error);
    res.status(500).json({ success: false, message: 'Error updating profile image', error: error.message });
  }
};

module.exports = {
  registerStudent,
  bulkCreateStudents,
  loginStudent,
  getAllStudents,
  getStudentById,
  getNextRollNumber,
  updateStudent,
  deleteStudent,
  changePassword,
  changePin,
  updateProfileImage,
};
