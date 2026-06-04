const mongoose = require("mongoose");
const { baseSchemaOptions } = require("../../models/shared/schemaOptions");

const partnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 180,
      default: null,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: null,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 2048,
      match: /^https?:\/\/.+/i,
      default: null,
    },
    apiKeyHash: {
      type: String,
      required: true,
      select: false,
      maxlength: 128,
    },
    apiKeyPreview: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "partners" },
);

partnerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
partnerSchema.index({ status: 1, createdAt: -1 });
partnerSchema.index({ createdAt: -1 });
partnerSchema.index({ companyName: 1 });
partnerSchema.index(
  { apiKeyHash: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

module.exports = mongoose.models.Partner || mongoose.model("Partner", partnerSchema);
