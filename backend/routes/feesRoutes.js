const express = require('express');
const router = express.Router();
const { createFee, getAllFees, getFeeById, updateFee, deleteFee, getFeeSummary } = require('../controllers/feesController');
const { auth, adminAuth } = require('../middleware/auth');

const FeesPageSecurity = require('../models/FeesPageSecurity');
const crypto = require('crypto');

const FEES_PAGE_KEY = 'fees_page_password';

const feesGate = async (req, res, next) => {
  try {
    const provided = req.header('X-Fees-Gate-Token');
    if (!provided) {
      return res.status(401).json({ success: false, message: 'Fees page password required' });
    }

    const doc = await FeesPageSecurity.findOne({ key: FEES_PAGE_KEY });
    if (!doc?.passwordHash) {
      return res.status(400).json({ success: false, message: 'Fees page password is not set yet' });
    }

    const expected = crypto
      .createHash('sha256')
      .update(`${doc.passwordHash}.${process.env.JWT_SECRET}`)
      .digest('hex');

    if (provided !== expected) {
      return res.status(401).json({ success: false, message: 'Invalid fees page password token' });
    }
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

router.post('/', auth, adminAuth, feesGate, createFee);
router.get('/', auth, adminAuth, feesGate, getAllFees);
router.get('/summary', auth, adminAuth, feesGate, getFeeSummary);
router.get('/:id', auth, adminAuth, feesGate, getFeeById);
router.patch('/:id', auth, adminAuth, feesGate, updateFee);
router.delete('/:id', auth, adminAuth, feesGate, deleteFee);

module.exports = router;
