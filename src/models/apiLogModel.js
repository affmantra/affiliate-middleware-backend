const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./shared/schemaOptions");

const apiLogSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    },
    requestId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    endpoint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    },
    direction: {
      type: String,
      required: true,
      enum: ["inbound", "outbound"],
      default: "inbound",
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    body: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    response: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    statusCode: {
      type: Number,
      min: 100,
      max: 599,
      default: null,
    },
    latency: {
      type: Number,
      min: 0,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
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
    msisdnHash: {
      type: String,
      select: false,
      maxlength: 128,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ["received", "success", "failed", "rejected", "timeout"],
      default: "received",
    },
    httpStatus: {
      type: Number,
      min: 100,
      max: 599,
      default: null,
    },
    durationMs: {
      type: Number,
      min: 0,
      default: null,
    },
    errorCode: {
      type: String,
      trim: true,
      maxlength: 80,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { ...baseSchemaOptions, collection: "api_logs" },
);

apiLogSchema.index({ partnerId: 1, createdAt: -1 });
apiLogSchema.index({ requestId: 1 }, { unique: true });
apiLogSchema.index({ endpoint: 1, createdAt: -1 });
apiLogSchema.index({ method: 1, createdAt: -1 });
apiLogSchema.index({ advertId: 1, createdAt: -1 });
apiLogSchema.index({ clickId: 1, createdAt: -1 });
apiLogSchema.index({ status: 1, createdAt: -1 });
apiLogSchema.index({ statusCode: 1, createdAt: -1 });
apiLogSchema.index({ msisdnHash: 1, createdAt: -1 });
apiLogSchema.index({ createdAt: -1 });
apiLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("ApiLog", apiLogSchema);
