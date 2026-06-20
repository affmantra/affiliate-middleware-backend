const crypto = require("crypto");
const Session = require("../../models/sessionModel");
const { getAntiFraudScript } = require("../../services/advertiserScriptService");
const { resolveAdvertiserProduct } = require("../../services/advertiserProductResolver");
const { AppError } = require("../../utils/appError");
const { getClientIp } = require("../../utils/requestContext");

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function hashIp(ipAddress) {
  if (!ipAddress) return null;
  return crypto.createHash("sha256").update(ipAddress).digest("hex");
}

function buildRequestData(req) {
  return {
    body: req.body,
    headers: {
      referer: req.get("referer") || null,
      origin: req.get("origin") || null,
      userAgent: req.get("user-agent") || null,
    },
    requestId: req.id,
    apiVersion: req.apiVersion,
    advertiserContext: req.advertiserContext,
  };
}

async function upsertScriptSession({ req, advertiserResponse }) {
  const ipAddress = getClientIp(req);
  const userAgent = req.get("user-agent") || null;
  const requestData = buildRequestData(req);
  const advertId = advertiserResponse.advertId;

  return Session.findOneAndUpdate(
    {
      partnerId: req.partner.id,
      productId: req.body.productId,
      clickId: req.body.clickId,
    },
    {
      partnerId: req.partner.id,
      productId: req.body.productId,
      advertId,
      clickId: req.body.clickId,
      provider: advertiserResponse.provider || "advertiser",
      status: "script_served",
      requestData,
      responseData: advertiserResponse,
      ipAddress,
      ipHash: hashIp(ipAddress),
      userAgent,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
  );
}

async function servePublisherScript(req) {
  const product = resolveAdvertiserProduct(req.body.productId);

  if (!product) {
    throw new AppError("productId is invalid or not configured.", 400);
  }

  const advertiserPayload = {
    requestId: req.id,
    partnerId: req.partner.id,
    partnerCode: req.partner.email,
    product,
    productId: product.id,
    clickId: req.body.clickId,
    buttonId: req.body.buttonId,
    body: req.body,
    ipAddress: getClientIp(req),
    userAgent: req.get("user-agent") || null,
    apiVersion: req.apiVersion,
    advertiserContext: req.advertiserContext,
  };

  const advertiserResponse = await getAntiFraudScript(advertiserPayload);
  if (!advertiserResponse.advertId) {
    const error = new Error("Advertiser script API returned an invalid response.");
    error.statusCode = 502;
    throw error;
  }

  const session = await upsertScriptSession({ advertiserResponse, req });
  const script = typeof advertiserResponse.script === "string" ? advertiserResponse.script : "";

  return {
    sessionId: session._id,
    requestId: req.id,
    advertId: advertiserResponse.advertId,
    productId: product.id,
    clickId: req.body.clickId,
    buttonId: req.body.buttonId,
    script,
    launchSnippet:
      "var ev = new Event('DCBProtectRun'); document.dispatchEvent(ev); console.log('ev: ', ev);",
  };
}

module.exports = { servePublisherScript };
