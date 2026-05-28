const Admin = require("../models/adminModel");
const { AppError } = require("../utils/appError");
const { hashPassword } = require("./passwordService");

function toPublicUser(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

async function listAdminUsers() {
  const users = await Admin.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .select("name email role status lastLoginAt createdAt updatedAt")
    .lean();

  return users.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
}

async function getAdminUser(userId) {
  const admin = await Admin.findOne({ _id: userId, deletedAt: null }).select(
    "name email role status lastLoginAt createdAt updatedAt",
  );

  if (!admin) {
    throw new AppError("Admin user not found.", 404);
  }

  return toPublicUser(admin);
}

async function createAdminUser({ name, email, password, role = "admin", status = "active" }) {
  const existingAdmin = await Admin.findOne({ email, deletedAt: null });

  if (existingAdmin) {
    throw new AppError("An admin user with this email already exists.", 409);
  }

  const admin = await Admin.create({
    name,
    email,
    role,
    status,
    passwordHash: await hashPassword(password),
  });

  return toPublicUser(admin);
}

async function updateAdminUserPassword(userId, password) {
  const admin = await Admin.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    { passwordHash: await hashPassword(password) },
    { new: true, runValidators: true },
  );

  if (!admin) {
    throw new AppError("Admin user not found.", 404);
  }

  return toPublicUser(admin);
}

async function updateAdminUserStatus(userId, status, actingAdminId) {
  if (userId === actingAdminId.toString() && status !== "active") {
    throw new AppError("You cannot block or deactivate your own account.", 400);
  }

  const admin = await Admin.findOneAndUpdate(
    { _id: userId, deletedAt: null },
    { status },
    { new: true, runValidators: true },
  );

  if (!admin) {
    throw new AppError("Admin user not found.", 404);
  }

  return toPublicUser(admin);
}

module.exports = {
  createAdminUser,
  getAdminUser,
  listAdminUsers,
  updateAdminUserPassword,
  updateAdminUserStatus,
};
