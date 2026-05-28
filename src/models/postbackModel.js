const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./shared/schemaOptions");

const postbackSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      default: null,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    advertId: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    clickId: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ["received", "processed", "failed", "ignored"],
      default: "received",
    },
    signatureStatus: {
      type: String,
      required: true,
      enum: ["pending", "valid", "invalid", "not_provided"],
      default: "pending",
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      select: false,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    errorCode: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "postbacks" },
);

postbackSchema.index({ provider: 1, eventId: 1 }, { unique: true });
postbackSchema.index({ partnerId: 1, createdAt: -1 });
postbackSchema.index({ subscriptionId: 1, createdAt: -1 });
postbackSchema.index({ advertId: 1, createdAt: -1 });
postbackSchema.index({ clickId: 1, createdAt: -1 });
postbackSchema.index({ status: 1, createdAt: -1 });
postbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Postback", postbackSchema);
