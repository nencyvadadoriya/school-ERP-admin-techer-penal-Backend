const express = require('express');
const router = express.Router();
const { getAdminDashboard, getTeacherDashboard, getStudentDashboard } = require('../controllers/dashboardController');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/admin', auth, adminAuth, getAdminDashboard);
router.get('/teacher', auth, getTeacherDashboard);
router.get('/student', auth, getStudentDashboard);

module.exports = router;
