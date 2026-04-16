const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  assignSubjects,
  forgotPassword,
  verifyOTPAndResetPassword,
} = require('../controllers/teacherController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/login', loginTeacher);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTPAndResetPassword);

// Admin only routes
router.post('/register', auth, adminAuth, upload.single('profile_image'), registerTeacher);
router.post('/:id/assign-subjects', auth, adminAuth, assignSubjects);
router.delete('/:id', auth, adminAuth, deleteTeacher);

// Protected routes
router.get('/', auth, getAllTeachers);
router.get('/:id', auth, getTeacherById);
router.patch('/:id', auth, upload.single('profile_image'), updateTeacher);

module.exports = router;
