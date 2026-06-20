const { AppError } = require("../utils/appError");

const buckets = new Map();

function defaultKeyGenerator(req) {
  return req.partner?.id || req.partner?._id || req.ip || "anonymous";
}

function rateLimiter({
  limit = 300,
  windowMs = 60 * 1000,
  keyGenerator = defaultKeyGenerator,
} = {}) {
  return function rateLimitRequest(req, res, next) {
    const now = Date.now();
    const key = String(keyGenerator(req));
    const existingBucket = buckets.get(key);

    if (!existingBucket || existingBucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });

      res.setHeader("x-rate-limit-limit", limit);
      res.setHeader("x-rate-limit-remaining", limit - 1);
      return next();
    }

    existingBucket.count += 1;
    const remaining = Math.max(limit - existingBucket.count, 0);

    res.setHeader("x-rate-limit-limit", limit);
    res.setHeader("x-rate-limit-remaining", remaining);
    res.setHeader("x-rate-limit-reset", Math.ceil(existingBucket.resetAt / 1000));

    if (existingBucket.count > limit) {
      return next(new AppError("Rate limit exceeded.", 429));
    }

    return next();
  };
}

function clearRateLimitBuckets() {
  buckets.clear();
}

module.exports = { clearRateLimitBuckets, rateLimiter };
