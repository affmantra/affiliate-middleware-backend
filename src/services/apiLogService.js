const crypto = require("crypto");
const mongoose = require("mongoose");
const ApiLog = require("../models/apiLogModel");
const { enqueueApiLog } = require("../queues/queueJobs");
const { getClientIp } = require("../utils/requestContext");

const MAX_JSON_BYTES = 24000;
const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "api_key",
  "apiKeyHash",
  "secret",
  "jwt",
];

function isSensitiveKey(key) {
  const normalizedKey = String(key || "").toLowerCase();
  return SENSITIVE_KEYS.some((sensitiveKey) =>
    normalizedKey.includes(sensitiveKey.toLowerCase()),
  );
}

function truncateString(value, maxLength = 2000) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...[truncated]`;
}

function sanitizeValue(value, depth = 0) {
  if (depth > 6) {
    return "[max-depth]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  }

  return Object.entries(value).reduce((sanitized, [key, itemValue]) => {
    sanitized[key] = isSensitiveKey(key)
      ? "[redacted]"
      : sanitizeValue(itemValue, depth + 1);
    return sanitized;
  }, {});
}

function fitPayloadSize(value) {
  if (value === null || value === undefined) {
    return value;
  }

  const serializedValue = JSON.stringify(value);
  if (Buffer.byteLength(serializedValue, "utf8") <= MAX_JSON_BYTES) {
    return value;
  }

  return {
    truncated: true,
    preview: truncateString(serializedValue, MAX_JSON_BYTES),
  };
}

function sanitizePayload(value) {
  return fitPayloadSize(sanitizeValue(value));
}

function getPartnerId(req) {
  const partnerId =
    req.partner?._id ||
    req.partnerId ||
    req.body?.partnerId ||
    req.query?.partnerId ||
    req.headers["x-partner-id"];

  if (!partnerId || !mongoose.Types.ObjectId.isValid(String(partnerId))) {
    return null;
  }

  return partnerId;
}

function getStatus(statusCode) {
  if (statusCode >= 200 && statusCode < 400) return "success";
  if (statusCode === 408) return "timeout";
  if (statusCode >= 400 && statusCode < 500) return "rejected";
  return "failed";
}

function buildLogEntry(req, responseBody, startedAt) {
  const statusCode = req.res?.statusCode || null;
  const latency = Date.now() - startedAt;

  return {
    partnerId: getPartnerId(req),
    requestId: req.id || crypto.randomUUID(),
    endpoint: req.originalUrl || req.url,
    method: req.method,
    direction: "inbound",
    headers: sanitizePayload(req.headers),
    body: sanitizePayload(req.body),
    response: sanitizePayload(responseBody),
    statusCode,
    latency,
    ipAddress: getClientIp(req),
    status: getStatus(statusCode || 500),
    httpStatus: statusCode,
    durationMs: latency,
  };
}

function writeLogEntryDirect(logEntry, label = "API log") {
  if (mongoose.connection.readyState !== 1) {
    return Promise.resolve(false);
  }

  return ApiLog.create(logEntry)
    .then(() => true)
    .catch((error) => {
      console.error(`Unable to write ${label}.`, error);
      return false;
    });
}

function enqueueOrWriteDirect(logEntry, label) {
  setImmediate(async () => {
    try {
      const queued = await enqueueApiLog(logEntry);
      if (!queued) {
        await writeLogEntryDirect(logEntry, label);
      }
    } catch (error) {
      console.error(`Unable to enqueue ${label}; falling back to direct write.`, error);
      await writeLogEntryDirect(logEntry, label);
    }
  });
}

function writeApiLogAsync(req, responseBody, startedAt) {
  const logEntry = buildLogEntry(req, responseBody, startedAt);
  enqueueOrWriteDirect(logEntry, "API log");
}

function buildOutboundLogEntry({
  parentRequestId,
  partnerId = null,
  endpoint,
  method = "POST",
  headers = {},
  body = null,
  response = null,
  statusCode = null,
  latency = null,
  ipAddress = null,
  advertId = null,
  clickId = null,
  status,
  errorCode = null,
}) {
  const safeStatusCode = statusCode || 500;
  return {
    partnerId,
    parentRequestId,
    requestId: crypto.randomUUID(),
    endpoint,
    method,
    direction: "outbound",
    headers: sanitizePayload(headers),
    body: sanitizePayload(body),
    response: sanitizePayload(response),
    statusCode,
    latency,
    ipAddress,
    advertId,
    clickId,
    status: status || getStatus(safeStatusCode),
    httpStatus: statusCode,
    durationMs: latency,
    errorCode,
  };
}

function writeOutboundApiLogAsync(payload) {
  const logEntry = buildOutboundLogEntry(payload);
  enqueueOrWriteDirect(logEntry, "outbound API log");
}

function getLogCategory(log) {
  const endpoint = String(log.endpoint || "");

  if (log.direction === "outbound") {
    return "advertiser";
  }

  if (/^\/api\/v\d+\/(publisher|postback)(\/|$)/.test(endpoint)) {
    return "partner";
  }

  if (/^\/api\/(admin|v\d+\/admin)(\/|$)/.test(endpoint)) {
    return "frontend";
  }

  return "system";
}

function buildCategoryClause(category) {
  if (!category || category === "all") {
    return null;
  }

  if (category === "advertiser") {
    return { direction: "outbound" };
  }

  if (category === "partner") {
    return {
      direction: "inbound",
      endpoint: { $regex: "^/api/v[0-9]+/(publisher|postback)(/|$)" },
    };
  }

  if (category === "frontend") {
    return {
      direction: "inbound",
      endpoint: { $regex: "^/api/(admin|v[0-9]+/admin)(/|$)" },
    };
  }

  return null;
}

function buildDateRangeFilter(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const createdAt = {};

  if (dateFrom) {
    createdAt.$gte = new Date(`${dateFrom}T00:00:00.000`);
  }

  if (dateTo) {
    createdAt.$lte = new Date(`${dateTo}T23:59:59.999`);
  }

  return { createdAt };
}

async function listApiLogs({
  limit = 50,
  page = 1,
  search,
  method,
  status,
  statusCode,
  partnerId,
  direction,
  category,
  dateFrom,
  dateTo,
} = {}) {
  const filter = {};
  const clauses = [];

  if (method) filter.method = method;
  if (status) filter.status = status;
  if (statusCode) filter.statusCode = statusCode;
  if (partnerId) filter.partnerId = partnerId;
  if (direction) filter.direction = direction;

  const categoryClause = buildCategoryClause(category);
  if (categoryClause) {
    clauses.push(categoryClause);
  }

  const dateRangeFilter = buildDateRangeFilter(dateFrom, dateTo);
  if (dateRangeFilter) {
    Object.assign(filter, dateRangeFilter);
  }

  if (search) {
    clauses.push({
      $or: [
        { endpoint: { $regex: search, $options: "i" } },
        { requestId: { $regex: search, $options: "i" } },
        { ipAddress: { $regex: search, $options: "i" } },
      ],
    });
  }

  if (clauses.length === 1) {
    Object.assign(filter, clauses[0]);
  } else if (clauses.length > 1) {
    filter.$and = clauses;
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    ApiLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "requestId parentRequestId endpoint method direction headers body response status statusCode latency ipAddress partnerId createdAt",
      )
      .lean(),
    ApiLog.countDocuments(filter),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log._id,
      requestId: log.requestId,
      parentRequestId: log.parentRequestId,
      category: getLogCategory(log),
      endpoint: log.endpoint,
      method: log.method,
      direction: log.direction,
      headers: log.headers,
      body: log.body,
      response: log.response,
      status: log.status,
      statusCode: log.statusCode,
      latency: log.latency,
      ipAddress: log.ipAddress,
      partnerId: log.partnerId,
      createdAt: log.createdAt,
    })),
    pagination: {
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  listApiLogs,
  sanitizePayload,
  writeLogEntryDirect,
  writeApiLogAsync,
  writeOutboundApiLogAsync,
};
