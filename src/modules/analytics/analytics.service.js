const ApiLog = require("../../models/apiLogModel");
const Lead = require("../../models/leadModel");

const SUCCESS_STATUSES = ["subscribed"];
const FAILED_STATUSES = ["failed", "rejected"];

function getDateRange({ dateFrom, dateTo, days = 30 } = {}) {
  const endDate = dateTo ? parseDateInput(dateTo) : new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = dateFrom ? parseDateInput(dateFrom) : new Date(endDate);
  if (!dateFrom) {
    startDate.setDate(startDate.getDate() - (days - 1));
  }
  startDate.setHours(0, 0, 0, 0);

  return { endDate, startDate };
}

function parseDateInput(value) {
  if (value instanceof Date) return new Date(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDateBuckets(startDate, endDate) {
  const buckets = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    buckets.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function normalizeDailyTrends(rawTrends, startDate, endDate) {
  const trendMap = new Map(rawTrends.map((item) => [item.date, item]));

  return buildDateBuckets(startDate, endDate).map((date) => {
    const item = trendMap.get(date) || {};
    const totalLeads = item.totalLeads || 0;
    const successfulSubscriptions = item.successfulSubscriptions || 0;
    const failedSubscriptions = item.failedSubscriptions || 0;

    return {
      date,
      totalLeads,
      successfulSubscriptions,
      failedSubscriptions,
      conversionRate: percent(successfulSubscriptions, totalLeads),
    };
  });
}

function normalizeSummary(summary = {}) {
  const totalLeads = summary.totalLeads || 0;
  const successfulSubscriptions = summary.successfulSubscriptions || 0;
  const failedSubscriptions = summary.failedSubscriptions || 0;

  return {
    totalLeads,
    successfulSubscriptions,
    failedSubscriptions,
    conversionRate: percent(successfulSubscriptions, totalLeads),
  };
}

function normalizePartnerPerformance(rows = []) {
  return rows.map((row) => {
    const totalLeads = row.totalLeads || 0;
    const successfulSubscriptions = row.successfulSubscriptions || 0;

    return {
      id: String(row.partnerId || row.partner?.email || row.partner?.name),
      partnerId: row.partnerId,
      partnerName: row.partner?.name || "Unknown Partner",
      companyName: row.partner?.companyName || null,
      email: row.partner?.email || null,
      totalLeads,
      successfulSubscriptions,
      failedSubscriptions: row.failedSubscriptions || 0,
      conversionRate: percent(successfulSubscriptions, totalLeads),
    };
  });
}

function normalizeApiMetrics(metrics = {}) {
  const totalRequests = metrics.totalRequests || 0;
  const failedRequests = metrics.failedRequests || 0;

  return {
    totalRequests,
    failedRequests,
    successfulRequests: metrics.successfulRequests || 0,
    errorRate: percent(failedRequests, totalRequests),
    avgLatency: Number((metrics.avgLatency || 0).toFixed(2)),
  };
}

function buildLeadAnalyticsPipeline({ startDate, endDate, partnerLimit }) {
  const dateMatch = { createdAt: { $gte: startDate, $lte: endDate } };

  return [
    { $match: dateMatch },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              failedSubscriptions: {
                $sum: { $cond: [{ $in: ["$status", FAILED_STATUSES] }, 1, 0] },
              },
              successfulSubscriptions: {
                $sum: { $cond: [{ $in: ["$status", SUCCESS_STATUSES] }, 1, 0] },
              },
              totalLeads: { $sum: 1 },
            },
          },
        ],
        dailyTrends: [
          {
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
              failedSubscriptions: {
                $sum: { $cond: [{ $in: ["$status", FAILED_STATUSES] }, 1, 0] },
              },
              successfulSubscriptions: {
                $sum: { $cond: [{ $in: ["$status", SUCCESS_STATUSES] }, 1, 0] },
              },
              totalLeads: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              date: "$_id",
              failedSubscriptions: 1,
              successfulSubscriptions: 1,
              totalLeads: 1,
            },
          },
        ],
        partnerPerformance: [
          {
            $group: {
              _id: "$partnerId",
              failedSubscriptions: {
                $sum: { $cond: [{ $in: ["$status", FAILED_STATUSES] }, 1, 0] },
              },
              successfulSubscriptions: {
                $sum: { $cond: [{ $in: ["$status", SUCCESS_STATUSES] }, 1, 0] },
              },
              totalLeads: { $sum: 1 },
            },
          },
          { $sort: { totalLeads: -1 } },
          { $limit: partnerLimit },
          {
            $lookup: {
              as: "partner",
              foreignField: "_id",
              from: "partners",
              localField: "_id",
            },
          },
          { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              partnerId: "$_id",
              failedSubscriptions: 1,
              partner: {
                companyName: "$partner.companyName",
                email: "$partner.email",
                name: "$partner.name",
              },
              successfulSubscriptions: 1,
              totalLeads: 1,
            },
          },
        ],
        recentActivity: [
          { $sort: { createdAt: -1 } },
          { $limit: 8 },
          {
            $lookup: {
              as: "partner",
              foreignField: "_id",
              from: "partners",
              localField: "partnerId",
            },
          },
          { $unwind: { path: "$partner", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              id: "$_id",
              advertId: 1,
              clickId: 1,
              createdAt: 1,
              partnerName: "$partner.name",
              productId: 1,
              status: 1,
            },
          },
        ],
      },
    },
  ];
}

function buildApiAnalyticsPipeline({ startDate, endDate }) {
  return [
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        direction: "inbound",
        endpoint: { $regex: "^/api/v[0-9]+/(publisher|postback)(/|$)" },
      },
    },
    {
      $facet: {
        metrics: [
          {
            $group: {
              _id: null,
              avgLatency: { $avg: "$latency" },
              failedRequests: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $gte: ["$statusCode", 400] },
                        { $in: ["$status", ["failed", "rejected", "timeout"]] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              successfulRequests: {
                $sum: { $cond: [{ $lt: ["$statusCode", 400] }, 1, 0] },
              },
              totalRequests: { $sum: 1 },
            },
          },
        ],
        requestCountsByDay: [
          {
            $group: {
              _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
              failedRequests: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $gte: ["$statusCode", 400] },
                        { $in: ["$status", ["failed", "rejected", "timeout"]] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              totalRequests: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              date: "$_id",
              failedRequests: 1,
              totalRequests: 1,
            },
          },
        ],
      },
    },
  ];
}

function normalizeRequestCounts(rows, startDate, endDate) {
  const rowMap = new Map(rows.map((item) => [item.date, item]));

  return buildDateBuckets(startDate, endDate).map((date) => {
    const item = rowMap.get(date) || {};
    const totalRequests = item.totalRequests || 0;
    const failedRequests = item.failedRequests || 0;

    return {
      date,
      failedRequests,
      totalRequests,
      errorRate: percent(failedRequests, totalRequests),
    };
  });
}

async function getDashboardAnalytics(options = {}) {
  const { endDate, startDate } = getDateRange(options);
  const partnerLimit = options.partnerLimit || 10;

  const [leadResults = [], apiResults = []] = await Promise.all([
    Lead.aggregate(buildLeadAnalyticsPipeline({ endDate, partnerLimit, startDate })),
    ApiLog.aggregate(buildApiAnalyticsPipeline({ endDate, startDate })),
  ]);
  const leadAggregation = leadResults[0] || {};
  const apiAggregation = apiResults[0] || {};

  const summary = normalizeSummary(leadAggregation.summary?.[0]);
  const apiMetrics = normalizeApiMetrics(apiAggregation.metrics?.[0]);

  return {
    filters: {
      dateFrom: dateKey(startDate),
      dateTo: dateKey(endDate),
      partnerLimit,
    },
    summary,
    apiMetrics,
    dailyTrends: normalizeDailyTrends(
      leadAggregation.dailyTrends || [],
      startDate,
      endDate,
    ),
    requestCounts: normalizeRequestCounts(
      apiAggregation.requestCountsByDay || [],
      startDate,
      endDate,
    ),
    partnerPerformance: normalizePartnerPerformance(
      leadAggregation.partnerPerformance || [],
    ),
    recentActivity: leadAggregation.recentActivity || [],
  };
}

module.exports = { getDashboardAnalytics };
