const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../utils/audit');

const recordFeesPageView = async (req, res) => {
  try {
    await logAudit(req, {
      action: 'FEES_PAGE_VIEW',
      entityType: 'FeesPageSecurity',
      meta: {
        message: 'Fees page accessed'
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getFeesAudit = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const filter = {
      action: { $regex: '^(FEES_|Create Fee|Update Fee)', $options: 'i' },
    };

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: p,
        limit: l,
        total,
        pages: Math.ceil(total / l),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getFeesAudit, recordFeesPageView };
