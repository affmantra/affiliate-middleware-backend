const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const Admin = require("../src/models/adminModel");
const { hashPassword } = require("../src/services/passwordService");

function readAdminConfiguration() {
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  if (!name || name.length < 2 || name.length > 100) {
    throw new Error("INITIAL_ADMIN_NAME must be between 2 and 100 characters.");
  }

  if (!email || !emailPattern.test(email) || email.length > 254) {
    throw new Error("INITIAL_ADMIN_EMAIL must be a valid email address.");
  }

  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be between 12 and 128 characters.");
  }

  return { email, name, password };
}

async function seedAdmin() {
  const { email, name, password } = readAdminConfiguration();

  await mongoose.connect(env.mongodbUri);

  const existingAdmin = await Admin.findOne({ email, deletedAt: null });

  if (existingAdmin) {
    console.log(`Admin already exists for ${email}; no password was changed.`);
    return;
  }

  await Admin.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: "super_admin",
    status: "active",
  });

  console.log(`Created initial super admin for ${email}.`);
}

seedAdmin()
  .catch((error) => {
    console.error("Unable to create initial admin.", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
