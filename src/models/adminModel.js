const mongoose = require("mongoose");
const { baseSchemaOptions, managedRecordFields } = require("./shared/schemaOptions");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 20,
      select: false,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "support"],
      default: "admin",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "blocked", "invited"],
      default: "active",
      required: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    ...managedRecordFields,
  },
  { ...baseSchemaOptions, collection: "admins" },
);

adminSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
adminSchema.index({ status: 1, createdAt: -1 });
adminSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Admin", adminSchema);
