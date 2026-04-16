const express = require('express');
const router = express.Router();
const { markAttendance, getAttendance, getStudentAttendance, deleteAttendance, getClassMonthSummary, getDailyAttendance, checkMissingAttendance, checkMyMissingAttendance } = require('../controllers/attendanceController');
const { auth, adminAuth, teacherAuth } = require('../middleware/auth');

router.post('/', auth, teacherAuth, markAttendance);
router.get('/check-missing-attendance', auth, adminAuth, checkMissingAttendance);
router.get('/check-my-missing-attendance', auth, teacherAuth, checkMyMissingAttendance);
router.get('/', auth, getAttendance);
router.get('/daily', auth, teacherAuth, getDailyAttendance);
router.get('/student', auth, getStudentAttendance);
router.get('/class-summary', auth, teacherAuth, getClassMonthSummary);
router.delete('/:id', auth, adminAuth, deleteAttendance);

module.exports = router;
