const express = require('express');
const router = express.Router();
const { createOrUpdateTimetable, getTimetableByClass, getAllTimetables, deleteTimetableEntry } = require('../controllers/timetableController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, adminAuth, createOrUpdateTimetable);
router.delete('/entry', auth, adminAuth, deleteTimetableEntry);
router.get('/', auth, getAllTimetables);
router.get('/:class_code', auth, getTimetableByClass);

module.exports = router;
