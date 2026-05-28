const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  authCookieName: process.env.AUTH_COOKIE_NAME || "admin_access_token",
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
}

module.exports = { env, validateServerEnvironment };
