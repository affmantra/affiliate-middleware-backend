const express = require("express");
const { rateLimiter } = require("../../middlewares/rateLimiter");
const { authenticatePartner } = require("../partners/partner.middleware");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getScript } = require("./publisherScript.controller");
const { validateScriptRequest } = require("./publisherScript.validation");

const router = express.Router();

router.post(
  "/script",
  authenticatePartner,
  rateLimiter({ limit: 600, windowMs: 60 * 1000 }),
  validateScriptRequest,
  asyncHandler(getScript),
);

module.exports = router;
