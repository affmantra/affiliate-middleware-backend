const { QUEUE_NAMES } = require("../queues/queueNames");
const { getDashboardAnalytics } = require("../modules/analytics/analytics.service");
const { createQueueWorker } = require("./workerFactory");

function startAnalyticsWorker() {
  return createQueueWorker(QUEUE_NAMES.analytics, async (job) => {
    const analytics = await getDashboardAnalytics(job.data || {});
    return {
      generatedAt: new Date().toISOString(),
      totalLeads: analytics.summary.totalLeads,
    };
  });
}

module.exports = { startAnalyticsWorker };
