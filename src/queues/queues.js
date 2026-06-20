const { Queue } = require("bullmq");
const { getRedisConnection, isQueueEnabled } = require("./redisConnection");
const { QUEUE_NAMES } = require("./queueNames");

const queues = {};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    delay: 5000,
    type: "exponential",
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 10000,
  },
  removeOnFail: false,
};

function getQueue(queueName) {
  if (!isQueueEnabled()) {
    return null;
  }

  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, {
      connection: getRedisConnection(),
      defaultJobOptions,
    });
  }

  return queues[queueName];
}

function getApiLogsQueue() {
  return getQueue(QUEUE_NAMES.apiLogs);
}

function getAdvertiserRetryQueue() {
  return getQueue(QUEUE_NAMES.advertiserRetry);
}

function getAnalyticsQueue() {
  return getQueue(QUEUE_NAMES.analytics);
}

async function closeQueues() {
  await Promise.all(Object.values(queues).map((queue) => queue.close()));
  Object.keys(queues).forEach((queueName) => {
    delete queues[queueName];
  });
}

module.exports = {
  closeQueues,
  getAdvertiserRetryQueue,
  getAnalyticsQueue,
  getApiLogsQueue,
  getQueue,
};
