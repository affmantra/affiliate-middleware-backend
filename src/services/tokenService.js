const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    path: "/",
  };
}

function generateAccessToken(admin) {
  return jwt.sign(
    { role: admin.role },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
      subject: admin._id.toString(),
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function setAuthCookie(res, token) {
  res.cookie(env.authCookieName, token, authCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(env.authCookieName, authCookieOptions());
}

module.exports = {
  clearAuthCookie,
  generateAccessToken,
  setAuthCookie,
  verifyAccessToken,
};
