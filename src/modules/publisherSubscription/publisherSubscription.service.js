const { env } = require("../../config/env");
const Lead = require("../../models/leadModel");
const Session = require("../../models/sessionModel");
const Subscription = require("../../models/subscriptionModel");
const { requestPinSubscription } = require("../../services/advertiserScriptService");
const { resolveAdvertiserProduct } = require("../../services/advertiserProductResolver");
const { prepareSubscriptionRequest } = require("../../services/requestQueueService");
const { AppError } = require("../../utils/appError");
const { getClientIp } = require("../../utils/requestContext");

function getNetworkName(body, product) {
  return body.networkname || product.networkName || env.advertiserNetworkName;
}

function getAdvertiserMessage(response) {
  if (!response) return null;
  if (typeof response === "string") return response;
  if (typeof response.message === "string") return response.message;
  if (typeof response.error === "string") return response.error;
  if (typeof response.raw === "string") return response.raw;

  return null;
}

function buildAdvertiserBusinessError(advertiserResponse) {
  const message = getAdvertiserMessage(advertiserResponse) || "Subscription request failed.";
  const error = new AppError(message, 422);
  error.code = "advertiser_subscription_rejected";
  error.details = advertiserResponse;
  return error;
}

function normalizeSubscriptionError(error) {
  const upstreamStatusCode = error.upstreamStatusCode;
  const isUpstreamClientError =
    upstreamStatusCode >= 400 && upstreamStatusCode < 500;
  const isAdvertiserRejection = error.details?.success === false;

  if (isUpstreamClientError || isAdvertiserRejection) {
    return buildAdvertiserBusinessError(error.details);
  }

  return error;
}

async function findMatchingSession(req) {
  const session = await Session.findOne({
    partnerId: req.partner.id,
    productId: req.body.productId,
    advertId: req.body.advertId,
    clickId: req.body.clickId,
  });

  if (!session) {
    throw new AppError("Matching script session was not found.", 404);
  }

  return session;
}

function buildLeadRequestData(req, session, networkname) {
  return {
    requestId: req.id,
    body: {
      advertId: req.body.advertId,
      productId: req.body.productId,
      clickId: req.body.clickId,
      msisdn: req.body.msisdn,
      networkname,
    },
    sessionId: session._id,
    apiVersion: req.apiVersion,
  };
}

async function createLead({ req, session, networkname }) {
  return Lead.create({
    partnerId: req.partner.id,
    sessionId: session._id,
    advertId: req.body.advertId,
    productId: req.body.productId,
    clickId: req.body.clickId,
    msisdn: req.body.msisdn,
    provider: "foodigo",
    status: "processing",
    requestData: buildLeadRequestData(req, session, networkname),
  });
}

async function updateLeadAfterResponse(lead, advertiserResponse) {
  const isSuccess = advertiserResponse.success === true && advertiserResponse.redirect;

  return Lead.findByIdAndUpdate(
    lead._id,
    {
      providerReference: advertiserResponse.userID || null,
      responseData: advertiserResponse,
      redirectUrl: advertiserResponse.redirect || null,
      status: isSuccess ? "processing" : "failed",
      errorCode: isSuccess ? null : advertiserResponse.message || "subscription_failed",
    },
    { new: true },
  );
}

async function createSubscription({ lead, session, advertiserResponse }) {
  if (advertiserResponse.success !== true || !advertiserResponse.userID) {
    return null;
  }

  return Subscription.create({
    partnerId: lead.partnerId,
    leadId: lead._id,
    sessionId: session._id,
    advertId: lead.advertId,
    productId: lead.productId,
    clickId: lead.clickId,
    msisdn: lead.msisdn,
    provider: "foodigo",
    providerReference: advertiserResponse.userID,
    operator: advertiserResponse.operator || null,
    redirectUrl: advertiserResponse.redirect || null,
    responseData: advertiserResponse,
    status: "pending",
  });
}

async function updateSessionStatus(session, status) {
  await Session.findByIdAndUpdate(session._id, { status });
}

async function subscribePublisher(req) {
  const product = resolveAdvertiserProduct(req.body.productId);

  if (!product) {
    throw new AppError("productId is invalid or not configured.", 400);
  }

  const networkname = getNetworkName(req.body, product);

  if (!networkname) {
    throw new AppError("networkname is required for subscription request.", 400);
  }

  const session = await findMatchingSession(req);
  const lead = await createLead({ networkname, req, session });

  await prepareSubscriptionRequest({
    leadId: lead._id,
    partnerId: req.partner.id,
    sessionId: session._id,
    requestId: req.id,
  });

  try {
    const advertiserResponse = await requestPinSubscription({
      action: "subscribe",
      product,
      productId: product.id,
      networkname,
      msisdn: req.body.msisdn,
      clickid: req.body.clickId,
      advertId: req.body.advertId,
      requestId: req.id,
      partnerId: req.partner.id,
      ipAddress: getClientIp(req),
    });

    const updatedLead = await updateLeadAfterResponse(lead, advertiserResponse);
    const subscription = await createSubscription({
      advertiserResponse,
      lead,
      session,
    });

    await updateSessionStatus(session, advertiserResponse.success ? "submitted" : "failed");

    if (advertiserResponse.success !== true || !advertiserResponse.redirect) {
      throw buildAdvertiserBusinessError(advertiserResponse);
    }

    return {
      leadId: updatedLead._id,
      subscriptionId: subscription?._id || null,
      redirectUrl: advertiserResponse.redirect,
      msisdn: advertiserResponse.msisdn || req.body.msisdn,
      operator: advertiserResponse.operator || null,
      userId: advertiserResponse.userID || null,
      status: updatedLead.status,
    };
  } catch (error) {
    await Lead.findByIdAndUpdate(lead._id, {
      status: "failed",
      errorCode: error.message,
      responseData: error.details || { message: error.message },
    });
    await updateSessionStatus(session, "failed");
    throw normalizeSubscriptionError(error);
  }
}

module.exports = { subscribePublisher };
