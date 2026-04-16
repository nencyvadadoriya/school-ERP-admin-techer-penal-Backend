const express = require('express');
const router = express.Router();
const {
  registerAdmin, loginAdmin, getAllAdmins, getAdminById, updateAdmin, deleteAdmin,
  forgotPassword, verifyOTPAndResetPassword,
} = require('../controllers/adminController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// Auth
router.post('/register', upload.single('profile_image'), registerAdmin);
router.post('/login', loginAdmin);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTPAndResetPassword);

// Admin CRUD (list)
router.get('/', auth, adminAuth, getAllAdmins);

// ── Classes inline routes ──────────────────────────────────────────────
router.get('/classes', auth, async (req, res) => {
  try {
    const data = await Class.find({ is_delete: false }).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/classes', auth, adminAuth, async (req, res) => {
  try {
    const doc = await Class.create(req.body);
    res.status(201).json({ success: true, message: 'Class created', data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/classes/:id', auth, adminAuth, async (req, res) => {
  try {
    const doc = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/classes/:id', auth, adminAuth, async (req, res) => {
  try {
    await Class.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Subjects inline routes ─────────────────────────────────────────────
router.get('/subjects', auth, async (req, res) => {
  try {
    const data = await Subject.find({ is_delete: false }).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/subjects', auth, adminAuth, async (req, res) => {
  try {
    const doc = await Subject.create(req.body);
    res.status(201).json({ success: true, message: 'Subject created', data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/subjects/:id', auth, adminAuth, async (req, res) => {
  try {
    const doc = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data: doc });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/subjects/:id', auth, adminAuth, async (req, res) => {
  try {
    await Subject.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Admin single-admin routes (place after subresource routes to avoid catching subroutes)
router.get('/:id', auth, adminAuth, getAdminById);
router.patch('/:id', auth, adminAuth, upload.single('profile_image'), updateAdmin);
router.delete('/:id', auth, adminAuth, deleteAdmin);

module.exports = router;
