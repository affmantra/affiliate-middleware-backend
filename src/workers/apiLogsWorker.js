const { QUEUE_NAMES } = require("../queues/queueNames");
const { writeLogEntryDirect } = require("../services/apiLogService");
const { createQueueWorker } = require("./workerFactory");

function startApiLogsWorker() {
  return createQueueWorker(QUEUE_NAMES.apiLogs, async (job) => {
    await writeLogEntryDirect(job.data, "queued API log");
    return { written: true };
  });
}

module.exports = { startApiLogsWorker };
