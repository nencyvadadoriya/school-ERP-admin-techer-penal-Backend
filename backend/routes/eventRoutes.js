const express = require('express');
const router = express.Router();
const { createEvent, getAllEvents, updateEvent, deleteEvent } = require('../controllers/eventController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, adminAuth, createEvent);
router.get('/', auth, getAllEvents);
router.patch('/:id', auth, adminAuth, updateEvent);
router.delete('/:id', auth, adminAuth, deleteEvent);

module.exports = router;
