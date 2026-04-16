const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { auth } = require('../middleware/auth');

// All routes protected
router.use(auth);

// CRUD routes
router.post('/', classController.createClass);
router.get('/', classController.getAllClasses);
router.get('/code/:code', classController.getClassByCode);
router.get('/:id', classController.getClassById);
router.patch('/:id', classController.updateClass);
router.delete('/:id', classController.deleteClass);

// Assign teacher to class
router.patch('/:id/assign-teacher', classController.assignTeacher);
router.patch('/:id/class-teacher', classController.updateClassTeacher);
router.patch('/:id/subjects', classController.addSubjects);  // Add multiple subjects
router.post('/:id/subjects', classController.addSingleSubject);  // Add single subject
router.delete('/:id/subjects', classController.removeSubject);  // Remove subject

module.exports = router;