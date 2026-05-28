const mongoose = require("mongoose");
const AdminAuditLog = require("../models/adminAuditLogModel");
const { getRequestContext } = require("../utils/requestContext");

async function recordAdminAction(req, details) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }

  try {
    return await AdminAuditLog.create({
      adminId: details.adminId || req.admin?._id || null,
      adminEmail: details.adminEmail || req.admin?.email || null,
      ...details,
      ...getRequestContext(req),
    });
  } catch (error) {
    console.error("Unable to record admin audit log.", error);
    return null;
  }
}

async function listAdminAuditLogs({ adminId, limit = 50 } = {}) {
  const filter = {};

  if (adminId) {
    filter.adminId = adminId;
  }

  const logs = await AdminAuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select(
      "adminId adminEmail action entityType entityId outcome ipAddress userAgent browser device method path metadata createdAt",
    )
    .lean();

  return logs.map((log) => ({
    id: log._id,
    adminId: log.adminId,
    adminEmail: log.adminEmail,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    outcome: log.outcome,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    browser: log.browser,
    device: log.device,
    method: log.method,
    path: log.path,
    metadata: log.metadata,
    createdAt: log.createdAt,
  }));
}

module.exports = { listAdminAuditLogs, recordAdminAction };
