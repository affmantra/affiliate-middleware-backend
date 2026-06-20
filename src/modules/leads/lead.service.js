const Lead = require("../../models/leadModel");
const ApiLog = require("../../models/apiLogModel");
const { AppError } = require("../../utils/appError");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildLeadFilter(options = {}) {
  const filter = {};

  if (options.partnerId) filter.partnerId = options.partnerId;
  if (options.status) filter.status = options.status;
  if (options.advertId) filter.advertId = options.advertId;
  if (options.clickId) filter.clickId = options.clickId;
  if (options.productId) filter.productId = String(options.productId);

  if (options.search) {
    const regex = new RegExp(escapeRegex(options.search), "i");
    filter.$or = [
      { advertId: regex },
      { clickId: regex },
      { providerReference: regex },
      { redirectUrl: regex },
      { errorCode: regex },
    ];
  }

  if (options.dateFrom || options.dateTo) {
    filter.createdAt = {};
    if (options.dateFrom) filter.createdAt.$gte = new Date(options.dateFrom);
    if (options.dateTo) {
      const dateTo = new Date(options.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = dateTo;
    }
  }

  return filter;
}

function serializeLead(lead, { includeSensitive = false } = {}) {
  return {
    id: lead._id,
    partner: lead.partnerId
      ? {
          id: lead.partnerId._id || lead.partnerId,
          name: lead.partnerId.name || null,
          companyName: lead.partnerId.companyName || null,
          email: lead.partnerId.email || null,
        }
      : null,
    sessionId: lead.sessionId,
    advertId: lead.advertId,
    productId: lead.productId,
    clickId: lead.clickId,
    msisdn: includeSensitive ? lead.msisdn : undefined,
    provider: lead.provider,
    providerReference: lead.providerReference,
    status: lead.status,
    redirectUrl: lead.redirectUrl,
    errorCode: lead.errorCode,
    requestData: lead.requestData,
    responseData: lead.responseData,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

function serializeAdvertiserApiLog(log) {
  return {
    id: log._id,
    requestId: log.requestId,
    parentRequestId: log.parentRequestId,
    endpoint: log.endpoint,
    method: log.method,
    status: log.status,
    statusCode: log.statusCode,
    httpStatus: log.httpStatus,
    latency: log.latency,
    durationMs: log.durationMs,
    ipAddress: log.ipAddress,
    advertId: log.advertId,
    clickId: log.clickId,
    errorCode: log.errorCode,
    body: log.body,
    response: log.response,
    createdAt: log.createdAt,
  };
}

async function listLeads(options) {
  const page = options.page;
  const limit = options.limit;
  const skip = (page - 1) * limit;
  const filter = buildLeadFilter(options);

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("partnerId", "name companyName email")
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return {
    leads: items.map((lead) => serializeLead(lead)),
    pagination: {
      limit,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    },
  };
}

async function getLeadDetails(leadId) {
  const lead = await Lead.findById(leadId)
    .select("+msisdn")
    .populate("partnerId", "name companyName email")
    .lean();

  if (!lead) {
    throw new AppError("Lead not found.", 404);
  }

  const partnerId = lead.partnerId?._id || lead.partnerId;
  const advertiserApiLogs = await ApiLog.find({
    direction: "outbound",
    partnerId,
    advertId: lead.advertId,
    clickId: lead.clickId,
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .select(
      "requestId parentRequestId endpoint method status statusCode httpStatus latency durationMs ipAddress advertId clickId errorCode body response createdAt",
    )
    .lean();

  return {
    ...serializeLead(lead, { includeSensitive: true }),
    advertiserApiLogs: advertiserApiLogs.map(serializeAdvertiserApiLog),
  };
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsv(rows) {
  const headers = [
    "Lead ID",
    "Partner",
    "Partner Email",
    "Advert ID",
    "Product ID",
    "Click ID",
    "MSISDN",
    "Provider",
    "Provider Reference",
    "Status",
    "Redirect URL",
    "Error Code",
    "Created At",
  ];

  const lines = rows.map((lead) =>
    [
      lead._id,
      lead.partnerId?.name || "",
      lead.partnerId?.email || "",
      lead.advertId,
      lead.productId,
      lead.clickId,
      lead.msisdn,
      lead.provider,
      lead.providerReference,
      lead.status,
      lead.redirectUrl,
      lead.errorCode,
      lead.createdAt?.toISOString?.() || lead.createdAt,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\n");
}

async function exportLeadsCsv(options) {
  const filter = buildLeadFilter(options);
  const rows = await Lead.find(filter)
    .sort({ createdAt: -1 })
    .limit(5000)
    .select("+msisdn")
    .populate("partnerId", "name companyName email")
    .lean();

  return buildCsv(rows);
}

module.exports = { exportLeadsCsv, getLeadDetails, listLeads };
