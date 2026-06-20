const express = require("express");
const { asyncHandler } = require("../../utils/asyncHandler");
const { receiveSubscriptionPostback } = require("./postback.controller");
const { validateSubscriptionPostback } = require("./postback.validation");

const router = express.Router();

router.post(
  "/subscription",
  validateSubscriptionPostback,
  asyncHandler(receiveSubscriptionPostback),
);

router.get(
  "/subscription",
  validateSubscriptionPostback,
  asyncHandler(receiveSubscriptionPostback),
);

module.exports = router;
