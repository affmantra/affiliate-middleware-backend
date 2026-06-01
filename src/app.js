const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const helmet = require("helmet");
const { env } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const { requestLogger } = require("./middlewares/requestLogger");
const adminAuditLogRoutes = require("./routes/adminAuditLogRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const healthRoutes = require("./routes/healthRoutes");
const partnerRoutes = require("./modules/partners/partner.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use("/health", healthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/audit-logs", adminAuditLogRoutes);
app.use("/api/v1/admin/partners", partnerRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
