const { connectDatabase } = require("../config/database");
const { env, validateServerEnvironment } = require("../config/env");
const { isQueueEnabled } = require("../queues/redisConnection");
const { startAdvertiserRetryWorker } = require("./advertiserRetryWorker");
const { startAnalyticsWorker } = require("./analyticsWorker");
const { startApiLogsWorker } = require("./apiLogsWorker");

async function startWorkers() {
  validateServerEnvironment();

  if (!isQueueEnabled()) {
    console.log("Queues are disabled. Set QUEUES_ENABLED=true and REDIS_URL to start workers.");
    return;
  }

  await connectDatabase();

  const workers = [
    startApiLogsWorker(),
    startAdvertiserRetryWorker(),
    startAnalyticsWorker(),
  ];

  console.log(
    `Queue workers started with concurrency ${env.queueWorkerConcurrency}.`,
  );

  async function shutdown() {
    await Promise.all(workers.map((worker) => worker.close()));
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startWorkers().catch((error) => {
  console.error("Unable to start queue workers.", error);
  process.exit(1);
});
