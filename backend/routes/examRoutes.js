const express = require('express');
const router = express.Router();
const { createExam, getAllExams, getExamById, updateExam, deleteExam, submitResult, getResults } = require('../controllers/examController');
const { auth, adminAuth, teacherAuth } = require('../middleware/auth');

// Results routes FIRST (before /:id)
router.post('/results/submit', auth, teacherAuth, submitResult);
router.get('/results/all', auth, getResults);

// Exam CRUD
router.post('/', auth, teacherAuth, createExam);
router.get('/', auth, getAllExams);
router.get('/:id', auth, getExamById);
router.patch('/:id', auth, teacherAuth, updateExam);
router.delete('/:id', auth, adminAuth, deleteExam);

module.exports = router;
