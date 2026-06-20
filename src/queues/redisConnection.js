const IORedis = require("ioredis");
const { env } = require("../config/env");

let redisConnection = null;

function isQueueEnabled() {
  return Boolean(env.queuesEnabled && env.redisUrl);
}

function getRedisConnection() {
  if (!isQueueEnabled()) {
    return null;
  }

  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redisConnection.on("error", (error) => {
      console.error("Redis queue connection error.", error.message);
    });
  }

  return redisConnection;
}

async function closeRedisConnection() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

module.exports = { closeRedisConnection, getRedisConnection, isQueueEnabled };
