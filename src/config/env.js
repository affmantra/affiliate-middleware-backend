const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function numberFromEnv(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function csvFromEnv(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  clientOrigin: normalizeOrigin(process.env.CLIENT_ORIGIN),
  clientOrigins: csvFromEnv(process.env.CLIENT_ORIGIN),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  jwtIssuer: process.env.JWT_ISSUER || "affiliate-middleware",
  jwtAudience: process.env.JWT_AUDIENCE || "affiliate-middleware-admin",
  authCookieName: process.env.AUTH_COOKIE_NAME || "admin_access_token",
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || "100kb",
  rateLimitWindowMs: numberFromEnv(process.env.RATE_LIMIT_WINDOW_MS, 60 * 1000),
  rateLimitMax: numberFromEnv(process.env.RATE_LIMIT_MAX, 300),
  advertiserScriptUrl: process.env.ADVERTISER_SCRIPT_URL,
  advertiserScriptApiKey: process.env.ADVERTISER_SCRIPT_API_KEY,
  advertiserTlsRejectUnauthorized:
    process.env.ADVERTISER_TLS_REJECT_UNAUTHORIZED !== "false",
  advertiserSubscriptionUrl: process.env.ADVERTISER_SUBSCRIPTION_URL,
  advertiserSubscriptionApiKey: process.env.ADVERTISER_SUBSCRIPTION_API_KEY,
  advertiserNetworkName: process.env.ADVERTISER_NETWORK_NAME,
  postbackSignatureSecret: process.env.POSTBACK_SIGNATURE_SECRET,
  redisUrl: process.env.REDIS_URL,
  queuesEnabled: process.env.QUEUES_ENABLED === "true",
  queueWorkerConcurrency: Number(process.env.QUEUE_WORKER_CONCURRENCY) || 5,
};

function validateServerEnvironment() {
  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  if (!env.clientOrigin) {
    throw new Error("CLIENT_ORIGIN environment variable is required.");
  }

  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET environment variable must be at least 32 characters.");
  }

  if (env.queuesEnabled && !env.redisUrl) {
    throw new Error("REDIS_URL is required when QUEUES_ENABLED=true.");
  }

  if (env.nodeEnv === "production") {
    if (env.clientOrigins.includes("*")) {
      throw new Error("CLIENT_ORIGIN cannot be '*' in production.");
    }

    if (!env.jwtIssuer || !env.jwtAudience) {
      throw new Error("JWT_ISSUER and JWT_AUDIENCE are required in production.");
    }

    if (env.jwtExpiresIn === "never") {
      throw new Error("JWT_EXPIRES_IN must be finite in production.");
    }
  }
}

module.exports = { env, validateServerEnvironment };
