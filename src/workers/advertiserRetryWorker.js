const { QUEUE_NAMES } = require("../queues/queueNames");
const { createQueueWorker } = require("./workerFactory");

function startAdvertiserRetryWorker() {
  return createQueueWorker(QUEUE_NAMES.advertiserRetry, async (job) => {
    // Current retry jobs preserve failure context for controlled replay/manual handling.
    // Product-specific retry processors can be attached here as advertiser contracts mature.
    return {
      jobType: job.data?.jobType || job.name,
      retainedForReplay: true,
      requestId: job.data?.requestId || null,
    };
  });
}

module.exports = { startAdvertiserRetryWorker };
