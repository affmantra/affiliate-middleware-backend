const mongoose = require("mongoose");
const { baseSchemaOptions, managedRecordFields } = require("./shared/schemaOptions");

const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 40,
      match: /^[A-Z0-9_-]+$/,
    },
    docsSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 80,
      match: /^[a-z0-9-]+$/,
    },
    status: {
      type: String,
      enum: ["active", "blocked", "inactive"],
      default: "active",
      required: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      default: null,
    },
    apiKeyPrefix: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    apiKeyHash: {
      type: String,
      required: true,
      minlength: 20,
      select: false,
    },
    allowedIps: {
      type: [String],
      default: [],
      validate: {
        validator: (items) => items.length <= 50,
        message: "A partner may have no more than 50 allowed IP entries.",
      },
    },
    ...managedRecordFields,
  },
  { ...baseSchemaOptions, collection: "partners" },
);

partnerSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
partnerSchema.index(
  { docsSlug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
partnerSchema.index(
  { apiKeyHash: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
partnerSchema.index({ status: 1, createdAt: -1 });
partnerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Partner", partnerSchema);
