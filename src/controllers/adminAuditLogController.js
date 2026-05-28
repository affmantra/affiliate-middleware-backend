const { listAdminAuditLogs } = require("../services/auditLogService");

async function listAuditLogs(req, res) {
  const logs = await listAdminAuditLogs({
    adminId: req.query.adminId,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    data: { logs },
  });
}

module.exports = { listAuditLogs };
