const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./shared/schemaOptions");

const subscriptionSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
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
      required: true,
      trim: true,
      maxlength: 150,
    },
    operator: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
    redirectUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: null,
    },
    responseData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "active", "failed", "cancelled", "expired"],
      default: "pending",
    },
    subscribedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "subscriptions" },
);

subscriptionSchema.index({ partnerId: 1, createdAt: -1 });
subscriptionSchema.index({ leadId: 1 });
subscriptionSchema.index({ sessionId: 1 });
subscriptionSchema.index({ provider: 1, providerReference: 1 }, { unique: true });
subscriptionSchema.index({ advertId: 1, createdAt: -1 });
subscriptionSchema.index({ clickId: 1, createdAt: -1 });
subscriptionSchema.index({ productId: 1, createdAt: -1 });
subscriptionSchema.index({ partnerId: 1, productId: 1, clickId: 1 });
subscriptionSchema.index({ msisdn: 1, createdAt: -1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });
subscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Subscription", subscriptionSchema);
