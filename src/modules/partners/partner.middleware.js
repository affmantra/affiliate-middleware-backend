const { AppError } = require("../../utils/appError");
const partnerService = require("./partner.service");

async function ensureActivePartner(req, res, next) {
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

module.exports = { ensureActivePartner };
