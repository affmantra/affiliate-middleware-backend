const { AppError } = require("../utils/appError");

const SUPPORTED_API_VERSIONS = ["v1"];

function apiVersionMiddleware(req, res, next) {
  const version = `v${req.params.apiVersion}`;

  if (!SUPPORTED_API_VERSIONS.includes(version)) {
    return next(new AppError(`Unsupported API version: ${version}.`, 400));
  }

  req.apiVersion = version;
  req.advertiserContext = {
    advertId: req.body?.advertId || req.query?.advertId || req.get("x-advert-id") || null,
    advertiserId:
      req.body?.advertiserId || req.query?.advertiserId || req.get("x-advertiser-id") || null,
  };

  return next();
}

module.exports = { SUPPORTED_API_VERSIONS, apiVersionMiddleware };
