const { Worker } = require("bullmq");
const { env } = require("../config/env");
const { getRedisConnection } = require("../queues/redisConnection");

function createQueueWorker(queueName, processor) {
  const worker = new Worker(queueName, processor, {
    concurrency: env.queueWorkerConcurrency,
    connection: getRedisConnection(),
  });

  worker.on("completed", (job) => {
    console.log(`Queue job completed: ${queueName}#${job.id}`);
  });

  worker.on("failed", (job, error) => {
    const attemptsMade = job?.attemptsMade || 0;
    const maxAttempts = job?.opts?.attempts || 1;
    const isDeadLetter = attemptsMade >= maxAttempts;

    console.error(
      `Queue job failed: ${queueName}#${job?.id || "unknown"} ${error.message}`,
    );

    if (isDeadLetter) {
      console.error("Queue job moved to failed/dead-letter state.", {
        attemptsMade,
        jobId: job?.id,
        jobName: job?.name,
        queueName,
      });
    }
  });

  worker.on("error", (error) => {
    console.error(`Queue worker error: ${queueName}`, error);
  });

  return worker;
}

module.exports = { createQueueWorker };
