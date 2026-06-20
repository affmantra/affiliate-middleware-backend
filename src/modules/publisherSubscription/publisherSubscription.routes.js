const express = require("express");
const { rateLimiter } = require("../../middlewares/rateLimiter");
const { authenticatePartner } = require("../partners/partner.middleware");
const { asyncHandler } = require("../../utils/asyncHandler");
const { subscribe } = require("./publisherSubscription.controller");
const { validateSubscribeRequest } = require("./publisherSubscription.validation");

const router = express.Router();

router.post(
  "/subscribe",
  authenticatePartner,
  rateLimiter({ limit: 120, windowMs: 60 * 1000 }),
  validateSubscribeRequest,
  asyncHandler(subscribe),
);

module.exports = router;
