const { writeApiLogAsync } = require("../services/apiLogService");

function parseResponseBody(body) {
  if (body === undefined) return null;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (typeof body !== "string") return body;

  try {
    return JSON.parse(body);
  } catch (error) {
    return body;
  }
}

function apiLogger(req, res, next) {
  const startedAt = Date.now();
  let responseBody = null;

  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = function patchedJson(body) {
    responseBody = body;
    return originalJson(body);
  };

  res.send = function patchedSend(body) {
    if (responseBody === null) {
      responseBody = parseResponseBody(body);
    }

    return originalSend(body);
  };

  res.on("finish", () => {
    writeApiLogAsync(req, responseBody, startedAt);
  });

  return next();
}

module.exports = { apiLogger };
