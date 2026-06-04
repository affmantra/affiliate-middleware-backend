function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function parseUserAgent(userAgent = "") {
  const source = userAgent.toLowerCase();
  let browser = "Unknown";
  let device = "Desktop";

  if (source.includes("edg/")) browser = "Edge";
  else if (source.includes("chrome/")) browser = "Chrome";
  else if (source.includes("firefox/")) browser = "Firefox";
  else if (source.includes("safari/")) browser = "Safari";
  else if (source.includes("postman")) browser = "Postman";
  else if (source.includes("curl")) browser = "cURL";

  if (source.includes("mobile")) device = "Mobile";
  else if (source.includes("tablet") || source.includes("ipad")) device = "Tablet";

  return { browser, device };
}

function getRequestContext(req) {
  const userAgent = req.get("user-agent") || null;
  const parsedUserAgent = parseUserAgent(userAgent || "");

  return {
    ipAddress: getClientIp(req),
    userAgent,
    browser: parsedUserAgent.browser,
    device: parsedUserAgent.device,
    method: req.method,
    path: req.originalUrl,
  };
}

module.exports = { getClientIp, getRequestContext, parseUserAgent };
