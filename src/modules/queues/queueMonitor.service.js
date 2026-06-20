const { QUEUE_NAMES } = require("../../queues/queueNames");
const { getQueue } = require("../../queues/queues");
const { isQueueEnabled } = require("../../queues/redisConnection");

const JOB_STATES = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
];

function emptyCounts() {
  return JOB_STATES.reduce((counts, state) => {
    counts[state] = 0;
    return counts;
  }, {});
}

async function getQueueStats(queueName) {
  const queue = getQueue(queueName);

  if (!queue) {
    return {
      name: queueName,
      counts: emptyCounts(),
    };
  }

  const counts = await queue.getJobCounts(...JOB_STATES);

  return {
    name: queueName,
    counts: {
      ...emptyCounts(),
      ...counts,
    },
  };
}

async function getQueueOverview() {
  const enabled = isQueueEnabled();
  const queueNames = Object.values(QUEUE_NAMES);

  if (!enabled) {
    return {
      enabled,
      redisConfigured: false,
      queues: queueNames.map((queueName) => ({
        name: queueName,
        counts: emptyCounts(),
      })),
    };
  }

  const queues = await Promise.all(queueNames.map(getQueueStats));

  return {
    enabled,
    redisConfigured: true,
    queues,
  };
}

module.exports = { getQueueOverview };
