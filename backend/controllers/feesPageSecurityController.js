const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const FeesPageSecurity = require('../models/FeesPageSecurity');
const Admin = require('../models/Admin');
const { sendMail } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');

const FEES_PAGE_KEY = 'fees_page_password';

const getDoc = async () => {
  let doc = await FeesPageSecurity.findOne({ key: FEES_PAGE_KEY });
  if (!doc) doc = await FeesPageSecurity.create({ key: FEES_PAGE_KEY });
  return doc;
};

const getStatus = async (req, res) => {
  try {
    const doc = await getDoc();
    res.json({
      success: true,
      data: {
        isPasswordSet: !!doc.passwordHash,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const setPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password is required (min 4 chars)' });
    }

    const doc = await getDoc();
    if (doc.passwordHash) {
      return res.status(400).json({ success: false, message: 'Password already set. Use change password.' });
    }

    doc.passwordHash = await bcrypt.hash(password, 10);
    doc.lastChangedBy = req.user?.id;
    await doc.save();

    await logAudit(req, { action: 'FEES_PASSWORD_SET', entityType: 'FeesPageSecurity', entityId: doc._id });

    res.json({ success: true, message: 'Fees page password set successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    const doc = await getDoc();
    if (!doc.passwordHash) {
      return res.status(400).json({ success: false, message: 'Fees page password is not set yet' });
    }

    const ok = await bcrypt.compare(password, doc.passwordHash);
    await logAudit(req, { action: 'FEES_PASSWORD_VERIFY', entityType: 'FeesPageSecurity', entityId: doc._id, meta: { ok } });

    if (!ok) return res.status(401).json({ success: false, message: 'Incorrect password' });

    // Return a short-lived gate token derived from server secret + current passwordHash.
    // Frontend will store this in sessionStorage and send in header for fees endpoints.
    const gateTokenRaw = `${doc.passwordHash}.${process.env.JWT_SECRET}`;
    const gateToken = crypto.createHash('sha256').update(gateTokenRaw).digest('hex');

    res.json({ success: true, message: 'Verified', data: { gateToken } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }

    const doc = await getDoc();
    if (!doc.passwordHash) {
      return res.status(400).json({ success: false, message: 'Fees page password is not set yet' });
    }

    const ok = await bcrypt.compare(currentPassword, doc.passwordHash);
    if (!ok) {
      await logAudit(req, { action: 'FEES_PASSWORD_CHANGE', entityType: 'FeesPageSecurity', entityId: doc._id, meta: { ok: false } });
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    doc.passwordHash = await bcrypt.hash(newPassword, 10);
    doc.lastChangedBy = req.user?.id;
    doc.resetCodeHash = undefined;
    doc.resetCodeExpiresAt = undefined;
    await doc.save();

    await logAudit(req, { action: 'FEES_PASSWORD_CHANGE', entityType: 'FeesPageSecurity', entityId: doc._id, meta: { ok: true } });

    res.json({ success: true, message: 'Fees page password changed successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const requestReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const admin = await Admin.findOne({ email: email.toLowerCase().trim(), is_delete: false });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found with this email' });

    const doc = await getDoc();
    if (!doc.passwordHash) {
      return res.status(400).json({ success: false, message: 'Fees page password is not set yet' });
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    doc.resetCodeHash = await bcrypt.hash(code, 10);
    doc.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await doc.save();

    await sendMail({
      to: admin.email,
      subject: 'Fees Page Password Reset Code',
      text: `Your Fees page reset code is: ${code}. This code will expire in 10 minutes.`,
    });

    await logAudit(req, { action: 'FEES_PASSWORD_RESET_REQUEST', entityType: 'FeesPageSecurity', entityId: doc._id, meta: { email: admin.email } });

    res.json({ success: true, message: 'Reset code sent to email' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const confirmReset = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'email, code, newPassword are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim(), is_delete: false });
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found with this email' });

    const doc = await getDoc();
    if (!doc.resetCodeHash || !doc.resetCodeExpiresAt) {
      return res.status(400).json({ success: false, message: 'No reset requested' });
    }

    if (doc.resetCodeExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'Reset code expired' });
    }

    const ok = await bcrypt.compare(code, doc.resetCodeHash);
    if (!ok) {
      await logAudit(req, { action: 'FEES_PASSWORD_RESET_CONFIRM', entityType: 'FeesPageSecurity', entityId: doc._id, meta: { ok: false, email: admin.email } });
      return res.status(401).json({ success: false, message: 'Invalid reset code' });
    }

    doc.passwordHash = await bcrypt.hash(newPassword, 10);
    doc.lastChangedBy = admin._id;
    doc.resetCodeHash = undefined;
    doc.resetCodeExpiresAt = undefined;
    await doc.save();

    await logAudit(req, { action: 'FEES_PASSWORD_RESET_CONFIRM', entityType: 'FeesPageSecurity', entityId: doc._id, meta: { ok: true, email: admin.email } });

    res.json({ success: true, message: 'Fees page password reset successfully' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  getStatus,
  setPassword,
  verifyPassword,
  changePassword,
  requestReset,
  confirmReset,
};
