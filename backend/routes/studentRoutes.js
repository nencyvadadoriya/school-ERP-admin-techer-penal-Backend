const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/studentController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.post('/login', loginStudent);

// Protected routes (Student/Teacher/Admin)
router.post('/change-password', auth, changePassword);
router.post('/change-pin', auth, changePin);
router.post('/profile-image', auth, upload.single('profile_image'), updateProfileImage);

// Admin only routes
router.post('/register', auth, adminAuth, upload.single('profile_image'), registerStudent);
router.post('/bulk', auth, adminAuth, bulkCreateStudents);
router.get('/get-next-roll-number', auth, getNextRollNumber);
router.delete('/:id', auth, adminAuth, deleteStudent);

// Protected routes
router.get('/', auth, getAllStudents);
router.get('/:id', auth, getStudentById);
router.patch('/:id', auth, upload.single('profile_image'), updateStudent);

module.exports = router;
