const { enqueueAdvertiserRetry, enqueueAnalyticsJob } = require("../queues/queueJobs");

async function prepareSubscriptionRequest(payload) {
  return {
    jobType: "publisher_subscription",
    queued: false,
    preparedAt: new Date(),
    payload,
  };
}

async function preparePostbackRetry(payload) {
  const queued = await enqueueAdvertiserRetry({
    ...payload,
    jobType: "advertiser_postback_retry",
  }).catch((error) => {
    console.error("Unable to enqueue advertiser retry job.", error);
    return false;
  });

  return {
    jobType: "advertiser_postback_retry",
    queued,
    preparedAt: new Date(),
    payload,
  };
}

async function prepareAnalyticsRefresh(payload) {
  const queued = await enqueueAnalyticsJob(payload).catch((error) => {
    console.error("Unable to enqueue analytics refresh job.", error);
    return false;
  });

  return {
    jobType: "analytics_refresh",
    queued,
    preparedAt: new Date(),
    payload,
  };
}

module.exports = {
  prepareAnalyticsRefresh,
  preparePostbackRetry,
  prepareSubscriptionRequest,
};
