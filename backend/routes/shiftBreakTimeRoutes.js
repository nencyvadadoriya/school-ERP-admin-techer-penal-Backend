const express = require('express');
const router = express.Router();
const { upsertShiftBreakTime, getAllShiftBreakTimes, getShiftBreakTimeByShift } = require('../controllers/shiftBreakTimeController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, adminAuth, upsertShiftBreakTime);
router.get('/', auth, getAllShiftBreakTimes);
router.get('/:shift', auth, getShiftBreakTimeByShift);

module.exports = router;
