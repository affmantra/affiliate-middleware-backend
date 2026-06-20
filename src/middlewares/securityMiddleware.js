const { AppError } = require("../utils/appError");

const MONGO_OPERATOR_PREFIX = "$";
const DOTTED_KEY_PATTERN = /\./;
const DANGEROUS_STRING_PATTERNS = [
  /<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script\s*>/gi,
  /javascript\s*:/gi,
  /\son[a-z]+\s*=/gi,
];

function sanitizeString(value) {
  return DANGEROUS_STRING_PATTERNS.reduce(
    (sanitizedValue, pattern) => sanitizedValue.replace(pattern, ""),
    value,
  );
}

function sanitizeObject(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  if (typeof value !== "object") {
    return value;
  }

  return Object.entries(value).reduce((sanitized, [key, itemValue]) => {
    if (
      key.startsWith(MONGO_OPERATOR_PREFIX) ||
      DOTTED_KEY_PATTERN.test(key)
    ) {
      return sanitized;
    }

    sanitized[key] = sanitizeObject(itemValue);
    return sanitized;
  }, {});
}

function inputSanitizer(req, res, next) {
  req.body = sanitizeObject(req.body);
  req.params = sanitizeObject(req.params);
  req.query = sanitizeObject(req.query);

  return next();
}

function requireJsonContentType(req, res, next) {
  const contentLength = Number(req.headers["content-length"] || 0);
  const hasBody =
    contentLength > 0 || Boolean(req.headers["transfer-encoding"]);

  if (
    hasBody &&
    ["POST", "PUT", "PATCH"].includes(req.method) &&
    req.is("application/json") === false &&
    req.is("application/x-www-form-urlencoded") === false
  ) {
    return next(new AppError("Content-Type must be application/json.", 415));
  }

  return next();
}

function secureNoStore(req, res, next) {
  if (req.path.startsWith("/api/admin")) {
    res.setHeader("Cache-Control", "no-store");
  }

  return next();
}

module.exports = {
  inputSanitizer,
  requireJsonContentType,
  secureNoStore,
};
