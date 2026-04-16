const express = require('express');
const router = express.Router();
const { createHomework, getAllHomework, getHomeworkById, updateHomework, deleteHomework, checkMyHomework } = require('../controllers/homeworkController');
const { auth, teacherAuth, adminAuth } = require('../middleware/auth');

router.post('/', auth, teacherAuth, createHomework);
router.get('/check-my-homework', auth, checkMyHomework);
router.get('/', auth, getAllHomework);
router.get('/:id', auth, getHomeworkById);
router.patch('/:id', auth, teacherAuth, updateHomework);
router.delete('/:id', auth, adminAuth, deleteHomework);

module.exports = router;
