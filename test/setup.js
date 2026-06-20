const mongoose = require("mongoose");

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-value-with-at-least-32-characters";
process.env.JWT_ISSUER = process.env.JWT_ISSUER || "affiliate-middleware";
process.env.JWT_AUDIENCE =
  process.env.JWT_AUDIENCE || "affiliate-middleware-admin";
process.env.AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "admin_access_token";
process.env.REQUEST_BODY_LIMIT = process.env.REQUEST_BODY_LIMIT || "100kb";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || "60000";
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || "10000";
process.env.QUEUES_ENABLED = process.env.QUEUES_ENABLED || "false";

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
