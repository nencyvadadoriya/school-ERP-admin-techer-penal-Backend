const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { uploadToCloudinary } = require('../config/cloudinary');
const { sendOTPEmail } = require('../utils/emailService');

// Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email, is_delete: false });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin with this email not found',
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP and expiry (10 minutes)
    admin.resetPasswordOTP = otp;
    admin.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await admin.save();

    // Send Email
    const emailSent = await sendOTPEmail(email, otp);
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
    console.error('Error in forgotPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message,
    });
  }
};

// Verify OTP and Reset Password
const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const admin = await Admin.findOne({
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() },
      is_delete: false
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Hash new password
    admin.password = await bcrypt.hash(newPassword, 10);
    
    // Clear OTP fields
    admin.resetPasswordOTP = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    console.error('Error in verifyOTPAndResetPassword:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message,
    });
  }
};

// Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, pin } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email, is_delete: false });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle profile image upload
    let profileImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/admins');
      profileImageUrl = uploadResult.url;
    }

    // Create admin
    const admin = await Admin.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      phone,
      pin,
      profile_image: profileImageUrl,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: adminResponse,
      token,
    });
  } catch (error) {
    console.error('Error in registerAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering admin',
      error: error.message,
    });
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ email, is_delete: false });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: adminResponse,
      token,
    });
  } catch (error) {
    console.error('Error in loginAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// Get All Admins
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({ is_delete: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: admins.length,
      data: admins,
    });
  } catch (error) {
    console.error('Error in getAllAdmins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message,
    });
  }
};

// Get Single Admin
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findOne({ _id: id, is_delete: false }).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    res.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error('Error in getAdminById:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin',
      error: error.message,
    });
  }
};

// Update Admin
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, pin, is_active, remove_profile_image } = req.body;

    // Check if admin exists
    const admin = await Admin.findOne({ _id: id, is_delete: false });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Handle profile image removal
    if (remove_profile_image === true || remove_profile_image === 'true') {
      admin.profile_image = null;
    }

    // Handle profile image upload
    let profileImageUrl = admin.profile_image;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file, 'school-erp/admins');
      profileImageUrl = uploadResult.url;
    }

    // Update admin
    if (first_name) admin.first_name = first_name;
    if (last_name) admin.last_name = last_name;
    if (phone) admin.phone = phone;
    if (pin) admin.pin = pin;
    admin.profile_image = profileImageUrl;
    if (typeof is_active !== 'undefined') admin.is_active = is_active;

    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: adminResponse,
    });
  } catch (error) {
    console.error('Error in updateAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin',
      error: error.message,
    });
  }
};

// Delete Admin (Soft Delete)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if admin exists
    const admin = await Admin.findOne({ _id: id, is_delete: false });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    // Soft delete
    admin.is_delete = true;
    await admin.save();

    res.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteAdmin:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting admin',
      error: error.message,
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  forgotPassword,
  verifyOTPAndResetPassword,
};
