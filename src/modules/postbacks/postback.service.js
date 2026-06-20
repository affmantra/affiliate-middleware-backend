const crypto = require("crypto");
const { env } = require("../../config/env");
const Lead = require("../../models/leadModel");
const Postback = require("../../models/postbackModel");
const Session = require("../../models/sessionModel");
const Subscription = require("../../models/subscriptionModel");
const { preparePostbackRetry } = require("../../services/requestQueueService");
const { AppError } = require("../../utils/appError");

function buildEventId(payload) {
  return payload.eventId || `subscription:${payload.clickid}:${payload.ema}`;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function validateSignature(payload, signature) {
  if (!env.postbackSignatureSecret) {
    return signature ? "pending" : "not_provided";
  }

  if (!signature) {
    return "invalid";
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.postbackSignatureSecret)
    .update(stableStringify(payload))
    .digest("hex");

  try {
    const provided = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (provided.length !== expected.length) {
      return "invalid";
    }

    return crypto.timingSafeEqual(provided, expected) ? "valid" : "invalid";
  } catch (error) {
    return "invalid";
  }
}

async function findMatchingRecords(payload) {
  const lead = await Lead.findOne({
    clickId: payload.clickid,
    msisdn: payload.ema,
  }).sort({ createdAt: -1 });

  if (!lead) {
    throw new AppError("Matching lead was not found.", 404);
  }

  const [subscription, session] = await Promise.all([
    Subscription.findOne({
      clickId: payload.clickid,
      msisdn: payload.ema,
      leadId: lead._id,
    }).sort({ createdAt: -1 }),
    Session.findOne({
      _id: lead.sessionId,
    }),
  ]);

  if (!subscription) {
    throw new AppError("Matching subscription was not found.", 404);
  }

  if (!session) {
    throw new AppError("Matching session was not found.", 404);
  }

  return { lead, session, subscription };
}

async function createPostbackOnce({ payload, records, signatureStatus }) {
  const eventId = buildEventId(payload);
  const existingPostback = await Postback.findOne({ provider: "foodigo", eventId });

  if (existingPostback) {
    return {
      duplicate: true,
      postback: existingPostback,
    };
  }

  const postback = await Postback.create({
    partnerId: records.lead.partnerId,
    subscriptionId: records.subscription._id,
    leadId: records.lead._id,
    provider: "foodigo",
    eventId,
    eventType: "subscription",
    advertId: records.lead.advertId,
    clickId: payload.clickid,
    status: "received",
    signatureStatus,
    payload,
  });

  return {
    duplicate: false,
    postback,
  };
}

async function markConversion({ postback, records }) {
  const now = new Date();

  const [lead, subscription] = await Promise.all([
    Lead.findByIdAndUpdate(
      records.lead._id,
      {
        status: "subscribed",
        errorCode: null,
      },
      { new: true },
    ),
    Subscription.findByIdAndUpdate(
      records.subscription._id,
      {
        status: "active",
        subscribedAt: records.subscription.subscribedAt || now,
      },
      { new: true },
    ),
    Session.findByIdAndUpdate(records.session._id, {
      status: "converted",
    }),
    Postback.findByIdAndUpdate(postback._id, {
      status: "processed",
      processedAt: now,
    }),
  ]);

  return { lead, subscription };
}

async function processSubscriptionPostback(req) {
  const payload = req.postbackPayload;
  const signature = req.get("x-signature") || req.get("x-postback-signature");
  const signatureStatus = validateSignature(payload, signature);

  if (signatureStatus === "invalid") {
    throw new AppError("Postback signature is invalid.", 401);
  }

  try {
    const records = await findMatchingRecords(payload);
    const postbackResult = await createPostbackOnce({
      payload,
      records,
      signatureStatus,
    });

    if (postbackResult.duplicate) {
      return {
        duplicate: true,
        postbackId: postbackResult.postback._id,
        status: postbackResult.postback.status,
      };
    }

    const result = await markConversion({
      postback: postbackResult.postback,
      records,
    });

    return {
      duplicate: false,
      postbackId: postbackResult.postback._id,
      leadId: result.lead._id,
      subscriptionId: result.subscription._id,
      status: "processed",
    };
  } catch (error) {
    await preparePostbackRetry({
      payload,
      requestId: req.id,
      reason: error.message,
    });
    throw error;
  }
}

module.exports = { processSubscriptionPostback, validateSignature };
