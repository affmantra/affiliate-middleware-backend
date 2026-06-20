const crypto = require("crypto");

function requestTracker(req, res, next) {
  const incomingRequestId = req.get("x-request-id");
  const requestId =
    incomingRequestId && incomingRequestId.length <= 100
      ? incomingRequestId
      : crypto.randomUUID();

  req.id = requestId;
  req.requestId = requestId;
  req.startedAt = Date.now();

  res.setHeader("x-request-id", requestId);
  return next();
}

module.exports = { requestTracker };
