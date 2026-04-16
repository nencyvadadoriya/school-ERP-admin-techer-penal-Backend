const express = require('express');
const router = express.Router();
const { createNotice, getAllNotices, updateNotice, deleteNotice } = require('../controllers/noticeController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, adminAuth, createNotice);
router.get('/', auth, getAllNotices);
router.patch('/:id', auth, adminAuth, updateNotice);
router.delete('/:id', auth, adminAuth, deleteNotice);

module.exports = router;
