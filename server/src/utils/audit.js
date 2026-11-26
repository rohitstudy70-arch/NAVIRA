import AuditLog from '../models/AuditLog.js';

export function audit(req, action, entityType, entityId, before, after) {
  return AuditLog.create({
    actor: req.user?._id,
    action,
    entityType,
    entityId: entityId?.toString(),
    before,
    after,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
}
