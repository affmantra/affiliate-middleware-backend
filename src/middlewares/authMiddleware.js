const Admin = require("../models/adminModel");
const { env } = require("../config/env");
const { verifyAccessToken } = require("../services/tokenService");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");

const authenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies[env.authCookieName];

  if (!token) {
    throw new AppError("Authentication required.", 401);
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    throw new AppError("Authentication token is invalid or expired.", 401);
  }

  const admin = await Admin.findOne({
    _id: payload.sub,
    status: "active",
    deletedAt: null,
  });

  if (!admin) {
    throw new AppError("Authentication required.", 401);
  }

  req.admin = admin;
  return next();
});

const optionallyAuthenticateAdmin = asyncHandler(async (req, res, next) => {
  const token = req.cookies[env.authCookieName];

  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const admin = await Admin.findOne({
      _id: payload.sub,
      status: "active",
      deletedAt: null,
    });

    if (admin) {
      req.admin = admin;
    }
  } catch (error) {
    req.admin = null;
  }

  return next();
});

function authorizeRoles(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }

    return next();
  };
}

module.exports = { authenticateAdmin, authorizeRoles, optionallyAuthenticateAdmin };
