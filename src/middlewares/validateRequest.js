const { AppError } = require("../utils/appError");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const objectIdPattern = /^[a-f\d]{24}$/i;
const roles = ["super_admin", "admin", "support"];
const statuses = ["active", "blocked", "invited"];

function validateAdminLogin(req, res, next) {
  const { email, password } = req.body || {};
  const submittedFields = Object.keys(req.body || {});

  if (submittedFields.some((field) => !["email", "password"].includes(field))) {
    return next(new AppError("Unexpected login request field.", 400));
  }

  if (
    typeof email !== "string" ||
    !emailPattern.test(email.trim()) ||
    email.trim().length > 254
  ) {
    return next(new AppError("A valid email address is required.", 400));
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return next(new AppError("Password must be between 8 and 128 characters.", 400));
  }

  req.body.email = email.trim().toLowerCase();
  return next();
}

function validateCreateAdminUser(req, res, next) {
  const { name, email, password, role, status } = req.body || {};
  const submittedFields = Object.keys(req.body || {});

  if (
    submittedFields.some(
      (field) => !["name", "email", "password", "role", "status"].includes(field),
    )
  ) {
    return next(new AppError("Unexpected user request field.", 400));
  }

  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return next(new AppError("Name must be between 2 and 100 characters.", 400));
  }

  if (
    typeof email !== "string" ||
    !emailPattern.test(email.trim()) ||
    email.trim().length > 254
  ) {
    return next(new AppError("A valid email address is required.", 400));
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return next(new AppError("Password must be between 8 and 128 characters.", 400));
  }

  if (role !== undefined && !roles.includes(role)) {
    return next(new AppError("Role is invalid.", 400));
  }

  if (status !== undefined && !statuses.includes(status)) {
    return next(new AppError("Status is invalid.", 400));
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  return next();
}

function validateAdminUserId(req, res, next) {
  if (!objectIdPattern.test(req.params.id || "")) {
    return next(new AppError("User id is invalid.", 400));
  }

  return next();
}

function validateUpdateAdminUserStatus(req, res, next) {
  const { status } = req.body || {};
  const submittedFields = Object.keys(req.body || {});

  if (submittedFields.some((field) => field !== "status")) {
    return next(new AppError("Unexpected status request field.", 400));
  }

  if (!statuses.includes(status)) {
    return next(new AppError("Status is invalid.", 400));
  }

  return next();
}

function validateUpdateAdminUserPassword(req, res, next) {
  const { password } = req.body || {};
  const submittedFields = Object.keys(req.body || {});

  if (submittedFields.some((field) => field !== "password")) {
    return next(new AppError("Unexpected password request field.", 400));
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return next(new AppError("Password must be between 8 and 128 characters.", 400));
  }

  return next();
}

function validateAuditLogQuery(req, res, next) {
  const submittedFields = Object.keys(req.query || {});

  if (submittedFields.some((field) => !["limit", "adminId"].includes(field))) {
    return next(new AppError("Unexpected audit log query field.", 400));
  }

  if (req.query.adminId !== undefined && !objectIdPattern.test(req.query.adminId)) {
    return next(new AppError("Admin id is invalid.", 400));
  }

  if (req.query.limit === undefined) {
    req.query.limit = 50;
    return next();
  }

  const limit = Number(req.query.limit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return next(new AppError("Limit must be an integer between 1 and 100.", 400));
  }

  req.query.limit = limit;
  return next();
}

module.exports = {
  validateAuditLogQuery,
  validateAdminLogin,
  validateAdminUserId,
  validateCreateAdminUser,
  validateUpdateAdminUserPassword,
  validateUpdateAdminUserStatus,
};
