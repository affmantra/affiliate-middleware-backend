const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./shared/schemaOptions");

const leadSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    advertId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    clickId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    productId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
      default: "1",
    },
    msisdn: {
      type: String,
      required: true,
      trim: true,
      select: false,
      match: /^\+?[1-9]\d{6,14}$/,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
    },
    providerReference: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    requestData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    responseData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: ["received", "processing", "redirected", "subscribed", "failed", "rejected"],
      default: "received",
    },
    redirectUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    errorCode: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "leads" },
);

leadSchema.index({ partnerId: 1, createdAt: -1 });
leadSchema.index({ sessionId: 1 });
leadSchema.index({ partnerId: 1, clickId: 1 });
leadSchema.index({ partnerId: 1, productId: 1, clickId: 1 });
leadSchema.index({ productId: 1, createdAt: -1 });
leadSchema.index({ advertId: 1, createdAt: -1 });
leadSchema.index({ clickId: 1, createdAt: -1 });
leadSchema.index({ msisdn: 1, createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Lead", leadSchema);
