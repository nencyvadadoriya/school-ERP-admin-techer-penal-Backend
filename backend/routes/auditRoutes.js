const express = require('express');
const router = express.Router();

const { getFeesAudit, recordFeesPageView } = require('../controllers/auditController');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/fees', auth, adminAuth, getFeesAudit);
router.post('/fees/view', auth, adminAuth, recordFeesPageView);

module.exports = router;
