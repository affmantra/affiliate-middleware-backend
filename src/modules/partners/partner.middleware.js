const { AppError } = require("../../utils/appError");
const partnerService = require("./partner.service");

function extractApiKey(req) {
  const authorizationHeader = req.get("authorization");

  if (authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return authorizationHeader.slice(7).trim();
  }

  return req.get("x-api-key") || req.query?.apiKey || null;
}

async function validateApiKey(req, res, next) {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return next(new AppError("API key is required.", 401));
  }

  try {
    const partner = await partnerService.getPartnerByApiKey(apiKey);
    req.partner = partner;
    req.partnerId = partner.id;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function ensureActivePartner(req, res, next) {
  if (req.partner?.status) {
    if (req.partner.status === "blocked") {
      return next(new AppError("Partner is blocked.", 403));
    }

    if (req.partner.status !== "active") {
      return next(new AppError("Partner is not active.", 403));
    }

    req.partnerId = req.partner.id || req.partner._id;
    return next();
  }

  const partnerId =
    req.partner?._id ||
    req.partner?.id ||
    req.partnerId ||
    req.headers["x-partner-id"] ||
    req.body?.partnerId ||
    req.query?.partnerId;

  if (!partnerId) {
    return next(new AppError("Partner context is required.", 401));
  }

  const partner = await partnerService.getPartnerDetails(partnerId);

  if (partner.status === "blocked") {
    return next(new AppError("Partner is blocked.", 403));
  }

  if (partner.status !== "active") {
    return next(new AppError("Partner is not active.", 403));
  }

  req.partner = partner;
  return next();
}

const authenticatePartner = [validateApiKey, ensureActivePartner];

module.exports = { authenticatePartner, ensureActivePartner, validateApiKey };
