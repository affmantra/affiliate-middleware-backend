const queueMonitorService = require("./queueMonitor.service");

async function overview(req, res) {
  const data = await queueMonitorService.getQueueOverview();

  return res.success({
    data,
    message: "Queue status fetched successfully.",
  });
}

module.exports = { overview };
