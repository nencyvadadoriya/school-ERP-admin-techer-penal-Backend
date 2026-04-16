const Fees = require('../models/Fees');
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/audit');

const createFee = async (req, res) => {
  try {
    const receipt_number = 'RCP' + Date.now();
    const fee = await Fees.create({ ...req.body, receipt_number });

    await logAudit(req, {
      action: 'FEES_RECORD_CREATE',
      entityType: 'Fees',
      entityId: fee._id,
      meta: {
        gr_number: fee.gr_number,
        student_name: req.body.student_name, // Added for UI
        std: fee.std,
        division: fee.division,
        class_code: fee.class_code,
        shift: fee.shift,
        medium: fee.medium,
        stream: fee.stream,
        fee_type: fee.fee_type,
        total_amount: fee.total_amount,
        amount_paid: fee.amount_paid,
        pending_amount: (fee.total_amount || 0) - (fee.amount_paid || 0),
        academic_year: fee.academic_year,
      },
    });

    res.status(201).json({ success: true, message: 'Fee record created', data: fee });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllFees = async (req, res) => {
  try {
    const { gr_number, status, academic_year } = req.query;
    const filter = { is_delete: false };
    if (gr_number) filter.gr_number = gr_number;
    if (status) filter.status = status;
    if (academic_year) filter.academic_year = academic_year;
    const data = await Fees.find(filter).populate('student_id', '-password').sort({ due_date: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFeeById = async (req, res) => {
  try {
    const data = await Fees.findOne({ _id: req.params.id, is_delete: false }).populate('student_id', '-password');
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateFee = async (req, res) => {
  try {
    const { amount_paid, payment_mode, paid_date, status, student_name } = req.body;
    const fee = await Fees.findOne({ _id: req.params.id, is_delete: false });
    if (!fee) return res.status(404).json({ success: false, message: 'Not found' });
    if (amount_paid !== undefined) fee.amount_paid = amount_paid;
    if (payment_mode) fee.payment_mode = payment_mode;
    if (paid_date) fee.paid_date = paid_date;
    if (status) fee.status = status;
    // Auto-compute status
    if (fee.amount_paid >= fee.total_amount) fee.status = 'Paid';
    else if (fee.amount_paid > 0) fee.status = 'Partial';
    await fee.save();

    await logAudit(req, {
      action: 'FEES_RECORD_UPDATE',
      entityType: 'Fees',
      entityId: fee._id,
      meta: {
        gr_number: fee.gr_number,
        student_name: student_name, // Added for UI
        status: fee.status,
        total_amount: fee.total_amount,
        amount_paid: fee.amount_paid,
        pending_amount: (fee.total_amount || 0) - (fee.amount_paid || 0),
        payment_mode: fee.payment_mode,
        paid_date: fee.paid_date,
      },
    });

    res.json({ success: true, message: 'Updated', data: fee });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteFee = async (req, res) => {
  try {
    const fee = await Fees.findOne({ _id: req.params.id, is_delete: false });
    if (!fee) return res.status(404).json({ success: false, message: 'Not found' });

    // Permanently delete the fee record instead of soft delete
    await Fees.findByIdAndDelete(req.params.id);

    // Delete all related audit logs for this fee record
    await AuditLog.deleteMany({ entityId: req.params.id, entityType: 'Fees' });

    res.json({ success: true, message: 'Fee record and related history deleted permanently' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getFeeSummary = async (req, res) => {
  try {
    const fees = await Fees.find({ is_delete: false });
    const totalAmount = fees.reduce((s, f) => s + f.total_amount, 0);
    const totalCollected = fees.reduce((s, f) => s + f.amount_paid, 0);
    const pending = fees.filter(f => f.status === 'Pending' || f.status === 'Partial');
    res.json({ success: true, data: { totalAmount, totalCollected, pendingCount: pending.length, pendingAmount: totalAmount - totalCollected } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createFee, getAllFees, getFeeById, updateFee, deleteFee, getFeeSummary };
