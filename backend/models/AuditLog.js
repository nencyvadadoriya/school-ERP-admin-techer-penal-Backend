const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId },
  actorRole: { type: String },
  actorEmail: { type: String },
  action: { type: String, required: true, index: true },
  entityType: { type: String, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  meta: { type: Object },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
