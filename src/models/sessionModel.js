const mongoose = require("mongoose");
const { baseSchemaOptions } = require("./shared/schemaOptions");

const sessionSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
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
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 40,
    },
    status: {
      type: String,
      required: true,
      enum: ["created", "script_served", "submitted", "converted", "failed", "expired"],
      default: "created",
    },
    ipHash: {
      type: String,
      select: false,
      maxlength: 128,
      default: null,
    },
    userAgent: {
      type: String,
      maxlength: 400,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { ...baseSchemaOptions, collection: "sessions" },
);

sessionSchema.index({ partnerId: 1, createdAt: -1 });
sessionSchema.index({ partnerId: 1, advertId: 1 });
sessionSchema.index({ partnerId: 1, clickId: 1 }, { unique: true });
sessionSchema.index({ advertId: 1, createdAt: -1 });
sessionSchema.index({ clickId: 1, createdAt: -1 });
sessionSchema.index({ status: 1, createdAt: -1 });
sessionSchema.index({ createdAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Session", sessionSchema);
