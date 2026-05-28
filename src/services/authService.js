const Admin = require("../models/adminModel");
const { AppError } = require("../utils/appError");
const { comparePassword } = require("./passwordService");

function toPublicAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
  };
}

async function authenticateAdmin(email, password) {
  const admin = await Admin.findOne({
    email: email.toLowerCase(),
    deletedAt: null,
  }).select("+passwordHash");

  if (!admin || !(await comparePassword(password, admin.passwordHash))) {
    throw new AppError("Invalid email or password.", 401);
  }

  if (admin.status !== "active") {
    throw new AppError("This admin account is not active.", 403);
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  return admin;
}

module.exports = { authenticateAdmin, toPublicAdmin };
