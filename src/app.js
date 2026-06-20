const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");
const { env } = require("./config/env");
const { apiLogger } = require("./middlewares/apiLogger");
const { apiVersionMiddleware } = require("./middlewares/apiVersion");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const { rateLimiter } = require("./middlewares/rateLimiter");
const { requestLogger } = require("./middlewares/requestLogger");
const { requestTracker } = require("./middlewares/requestTracker");
const { responseFormatter } = require("./middlewares/responseFormatter");
const {
  inputSanitizer,
  requireJsonContentType,
  secureNoStore,
} = require("./middlewares/securityMiddleware");
const adminApiLogRoutes = require("./routes/adminApiLogRoutes");
const adminAuditLogRoutes = require("./routes/adminAuditLogRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const analyticsRoutes = require("./modules/analytics/analytics.routes");
const healthRoutes = require("./routes/healthRoutes");
const leadRoutes = require("./modules/leads/lead.routes");
const partnerRoutes = require("./modules/partners/partner.routes");
const postbackRoutes = require("./modules/postbacks/postback.routes");
const publisherScriptRoutes = require("./modules/publisherScript/publisherScript.routes");
const publisherSubscriptionRoutes = require("./modules/publisherSubscription/publisherSubscription.routes");
const queueMonitorRoutes = require("./modules/queues/queueMonitor.routes");

const app = express();

function isPartnerFacingPath(path) {
  return /^\/api\/v\d+\/(publisher|postback)(\/|$)/.test(path);
}

function corsOptionsDelegate(req, callback) {
  if (isPartnerFacingPath(req.path)) {
    return callback(null, {
      origin: true,
      credentials: false,
    });
  }

  return callback(null, {
    origin(origin, originCallback) {
      const normalizedOrigin = String(origin || "").replace(/\/+$/, "");

      if (!origin || env.clientOrigins.includes(normalizedOrigin)) {
        return originCallback(null, true);
      }

      const error = new Error("Origin is not allowed by CORS.");
      error.statusCode = 403;
      return originCallback(error);
    },
    credentials: true,
  });
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: env.nodeEnv === "production",
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use(requestTracker);
app.use(apiLogger);
app.use(cors(corsOptionsDelegate));
app.use(requireJsonContentType);
app.use(express.json({ limit: env.requestBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: env.requestBodyLimit }));
app.use(cookieParser());
app.use(inputSanitizer);
app.use(secureNoStore);
app.use(rateLimiter({ limit: env.rateLimitMax, windowMs: env.rateLimitWindowMs }));
app.use(responseFormatter);
app.use(requestLogger);
app.use("/api/v:apiVersion", apiVersionMiddleware);

app.use("/health", healthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/audit-logs", adminAuditLogRoutes);
app.use("/api/admin/api-logs", adminApiLogRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/admin/leads", leadRoutes);
app.use("/api/admin/queues", queueMonitorRoutes);
app.use("/api/v1/admin/partners", partnerRoutes);
app.use("/api/v1/publisher", publisherScriptRoutes);
app.use("/api/v1/publisher", publisherSubscriptionRoutes);
app.use("/api/v1/postback", postbackRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
