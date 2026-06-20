const { getAdvertiserRetryQueue, getAnalyticsQueue, getApiLogsQueue } = require("./queues");

async function enqueueApiLog(logEntry) {
  const queue = getApiLogsQueue();
  if (!queue) return false;

  await queue.add("write-api-log", logEntry, {
    jobId: logEntry.requestId,
  });
  return true;
}

async function enqueueAdvertiserRetry(payload) {
  const queue = getAdvertiserRetryQueue();
  if (!queue) return false;

  await queue.add("advertiser-retry", payload, {
    attempts: 5,
    backoff: {
      delay: 10000,
      type: "exponential",
    },
  });
  return true;
}

async function enqueueAnalyticsJob(payload) {
  const queue = getAnalyticsQueue();
  if (!queue) return false;

  await queue.add("analytics-refresh", payload, {
    attempts: 2,
  });
  return true;
}

module.exports = { enqueueAdvertiserRetry, enqueueAnalyticsJob, enqueueApiLog };
