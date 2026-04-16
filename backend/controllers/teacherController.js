const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const { uploadToCloudinary } = require('../config/cloudinary');
const { sendTeacherWelcomeEmail, sendOTPEmail } = require('../utils/emailService');

// Forgot Password - Send OTP for Teacher
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const teacher = await Teacher.findOne({ email, is_delete: false });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher with this email not found',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP and expiry (10 minutes)
    teacher.resetPasswordOTP = otp;
    teacher.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await teacher.save();

    // Send Email
    const schoolName = process.env.SCHOOL_NAME || 'Our School';
    const emailSent = await sendOTPEmail(email, otp, schoolName);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email',
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Error in teacher forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message,
    });
  }
};

// Verify OTP and Reset Password for Teacher
const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const teacher = await Teacher.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() },
      is_delete: false
    });

    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Hash new password
    teacher.password = await bcrypt.hash(newPassword, 10);
    
    // Clear OTP fields
    teacher.resetPasswordOTP = undefined;
    teacher.resetPasswordExpires = undefined;
    await teacher.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Error in teacher verifyOTPAndResetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message,
    });
  }
};

// Helper to accept either an array, a JSON-string, or a comma-separated string
const parseArrayInput = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // not JSON, fallthrough to comma-splitting
    }
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

// Generate Teacher Code
const generateTeacherCode = async () => {
  const count = await Teacher.countDocuments();
  const year = new Date().getFullYear();
  return `TCH${year}${String(count + 1).padStart(5, '0')}`;
};

// Register Teacher
const registerTeacher = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      phone,
      email,
      password,
      pin,
      experience,
      about,
      medium,
      assigned_class,
      subjects,
    } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email, is_delete: false });

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher with this email already exists',
      });
    }

    // Generate teacher code
    const teacher_code = await generateTeacherCode();

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/teachers');
      profileImageUrl = uploadResult.url;
    }

    const assignedClassArray = parseArrayInput(assigned_class);
    const subjectsArray = parseArrayInput(subjects);

    // Ensure password exists; if not provided, auto-generate a temporary one
    let plainPassword = password;
    if (!plainPassword) {
      plainPassword = Math.random().toString(36).slice(-8);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create teacher
    const teacher = await Teacher.create({
      teacher_code,
      first_name,
      last_name,
      phone,
      email,
      password: hashedPassword,
      pin,
      profile_image: profileImageUrl,
      experience: experience ? Number(experience) : 0,
      about,
      medium,
      assigned_class: assignedClassArray,
      subjects: subjectsArray,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, teacher_code: teacher.teacher_code, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response and include generated password if created
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    const responsePayload = {
      success: true,
      message: 'Teacher registered successfully',
      data: teacherResponse,
      token,
    };

    if (!password) {
      responsePayload.generated_password = plainPassword;
    }

    // Send Welcome Email
    try {
      const schoolName = process.env.SCHOOL_NAME || 'Our School';
      await sendTeacherWelcomeEmail({
        email: teacher.email,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        password: plainPassword,
        school_name: schoolName
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // We don't block the response even if email fails
    }

    res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error in registerTeacher:', error);
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }

    // Handle duplicate key errors (unique indexes)
    if (error.code === 11000) {
      const dupKey = Object.keys(error.keyValue || {}).join(', ');
      return res.status(400).json({ success: false, message: `Duplicate value for field(s): ${dupKey}` });
    }

    res.status(500).json({
      success: false,
      message: 'Error registering teacher',
      error: error.message,
    });
  }
};

// Login Teacher
const loginTeacher = async (req, res) => {
  try {
    const { email, teacher_code, password } = req.body;

    // Find teacher by email or teacher_code
    const query = { is_delete: false };
    if (email) query.email = email;
    else if (teacher_code) query.teacher_code = teacher_code;
    else {
      return res.status(400).json({ success: false, message: 'Email or teacher_code required' });
    }

    const teacher = await Teacher.findOne(query);

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/code or password',
      });
    }

    // Check if account is active
    if (!teacher.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact admin.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, teacher.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/code or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher._id, email: teacher.email, teacher_code: teacher.teacher_code, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: teacherResponse,
      token,
    });
  } catch (error) {
    console.error('Error in loginTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Get All Teachers
const getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ is_delete: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    console.error('Error in getAllTeachers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teachers',
      error: error.message,
    });
  }
};

// Get Single Teacher
const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findOne({ _id: id, is_delete: false }).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    res.json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    console.error('Error in getTeacherById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher',
      error: error.message,
    });
  }
};

// Update Teacher
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone,
      pin,
      experience,
      about,
      medium,
      assigned_class,
      subjects,
      subject_assignments,
      is_active,
      remove_profile_image,
    } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ _id: id, is_delete: false });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    // Handle profile image removal
    if (remove_profile_image === true || remove_profile_image === 'true') {
      teacher.profile_image = null;
    }

    // Handle profile image upload
    let profileImageUrl = teacher.profile_image;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/teachers');
      profileImageUrl = uploadResult.url;
    }

    // Parse arrays (accept array, JSON-string, or comma-separated string)
    const assignedClassArray = typeof assigned_class !== 'undefined' ? parseArrayInput(assigned_class) : teacher.assigned_class;
    const subjectsArray = typeof subjects !== 'undefined' ? parseArrayInput(subjects) : teacher.subjects;

    // Update teacher
    if (first_name) teacher.first_name = first_name;
    if (last_name) teacher.last_name = last_name;
    if (phone) teacher.phone = phone;
    if (pin) teacher.pin = pin;
    teacher.profile_image = profileImageUrl;
    if (typeof experience !== 'undefined') {
      teacher.experience = Number(experience);
    }
    if (about) teacher.about = about;
    if (typeof medium !== 'undefined') {
      teacher.medium = medium;
    }
    if (typeof assigned_class !== 'undefined') teacher.assigned_class = assignedClassArray;
    if (typeof subjects !== 'undefined') teacher.subjects = subjectsArray;
    if (typeof is_active !== 'undefined') {
      teacher.is_active = is_active;
    }

    // Update subject assignments if provided
    if (subject_assignments) {
      teacher.subject_assignments = Array.isArray(subject_assignments) 
        ? subject_assignments 
        : JSON.parse(subject_assignments);
    }

    await teacher.save();

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacherResponse,
    });
  } catch (error) {
    console.error('Error in updateTeacher:', error);
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
      message: 'Error updating teacher',
      error: error.message,
    });
  }
};

// Delete Teacher (Soft Delete)
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if teacher exists
    const teacher = await Teacher.findOne({ _id: id, is_delete: false });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    // Soft delete
    teacher.is_delete = true;
    await teacher.save();

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteTeacher:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting teacher',
      error: error.message,
    });
  }
};
// Assign Subjects to Teacher
const assignSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_assignments } = req.body;

    const teacher = await Teacher.findOne({ _id: id, is_delete: false });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    teacher.subject_assignments = subject_assignments;
    await teacher.save();

    res.json({
      success: true,
      message: 'Subjects assigned successfully',
      data: teacher,
    });
  } catch (error) {
    console.error('Error in assignSubjects:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning subjects',
      error: error.message,
    });
  }
};


module.exports = {
  registerTeacher,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignSubjects,
  forgotPassword,
  verifyOTPAndResetPassword,
};

