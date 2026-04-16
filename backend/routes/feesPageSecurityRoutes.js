const express = require('express');
const router = express.Router();

const {
  getStatus,
  setPassword,
  verifyPassword,
  changePassword,
  requestReset,
  confirmReset,
} = require('../controllers/feesPageSecurityController');

const { auth, adminAuth } = require('../middleware/auth');

router.get('/status', auth, adminAuth, getStatus);
router.post('/set-password', auth, adminAuth, setPassword);
router.post('/verify', auth, adminAuth, verifyPassword);
router.post('/change-password', auth, adminAuth, changePassword);
router.post('/reset/request', auth, adminAuth, requestReset);
router.post('/reset/confirm', auth, adminAuth, confirmReset);

module.exports = router;
