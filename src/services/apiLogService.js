const crypto = require("crypto");
const mongoose = require("mongoose");
const ApiLog = require("../models/apiLogModel");
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

function writeApiLogAsync(req, responseBody, startedAt) {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const logEntry = buildLogEntry(req, responseBody, startedAt);

  setImmediate(() => {
    ApiLog.create(logEntry).catch((error) => {
      console.error("Unable to write API log.", error);
    });
  });
}

async function listApiLogs({
  limit = 50,
  page = 1,
  search,
  method,
  status,
  statusCode,
  partnerId,
} = {}) {
  const filter = {};

  if (method) filter.method = method;
  if (status) filter.status = status;
  if (statusCode) filter.statusCode = statusCode;
  if (partnerId) filter.partnerId = partnerId;

  if (search) {
    filter.$or = [
      { endpoint: { $regex: search, $options: "i" } },
      { requestId: { $regex: search, $options: "i" } },
      { ipAddress: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    ApiLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "requestId endpoint method headers body response status statusCode latency ipAddress partnerId createdAt",
      )
      .lean(),
    ApiLog.countDocuments(filter),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log._id,
      requestId: log.requestId,
      endpoint: log.endpoint,
      method: log.method,
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

module.exports = { listApiLogs, sanitizePayload, writeApiLogAsync };
