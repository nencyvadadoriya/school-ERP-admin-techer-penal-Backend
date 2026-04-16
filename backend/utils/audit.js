const AuditLog = require('../models/AuditLog');

const logAudit = async (req, { action, entityType, entityId, meta }) => {
  try {
    await AuditLog.create({
      actorId: req.user?.id,
      actorRole: req.user?.role,
      actorEmail: req.user?.email,
      action,
      entityType,
      entityId,
      meta,
      ip: req.headers['x-forwarded-for']?.toString()?.split(',')?.[0]?.trim() || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  } catch (e) {
    // swallow audit errors
  }
};

module.exports = { logAudit };
