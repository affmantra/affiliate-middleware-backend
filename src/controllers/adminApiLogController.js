const { listApiLogs } = require("../services/apiLogService");

async function listLogs(req, res) {
  const result = await listApiLogs(req.query);

  res.status(200).json({
    success: true,
    data: result,
  });
}

module.exports = { listLogs };
