const { Schema } = require("mongoose");

const baseSchemaOptions = {
  timestamps: true,
  versionKey: false,
  strict: "throw",
};

const managedRecordFields = {
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: "Admin",
    default: null,
  },
};

module.exports = { baseSchemaOptions, managedRecordFields };
