const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./shared/schemaOptions");

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    adminEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: null,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login_success",
        "login_failed",
        "logout",
        "admin_user_created",
        "admin_user_password_updated",
        "admin_user_status_updated",
      ],
    },
    entityType: {
      type: String,
      enum: ["admin", "auth", "user"],
      default: "admin",
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    outcome: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
    userAgent: {
      type: String,
      maxlength: 500,
      default: null,
    },
    browser: {
      type: String,
      maxlength: 80,
      default: null,
    },
    device: {
      type: String,
      maxlength: 80,
      default: null,
    },
    method: {
      type: String,
      maxlength: 10,
      default: null,
    },
    path: {
      type: String,
      maxlength: 250,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "admin_audit_logs" },
);

adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });
adminAuditLogSchema.index({ outcome: 1, createdAt: -1 });
adminAuditLogSchema.index({ ipAddress: 1, createdAt: -1 });
adminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
