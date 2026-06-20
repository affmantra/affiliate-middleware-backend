const express = require("express");
const { authenticateAdmin, authorizeRoles } = require("../../middlewares/authMiddleware");
const { asyncHandler } = require("../../utils/asyncHandler");
const analyticsController = require("./analytics.controller");
const { validateDashboardQuery } = require("./analytics.validation");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin", "admin"));

router.get(
  "/dashboard",
  validateDashboardQuery,
  asyncHandler(analyticsController.dashboard),
);

module.exports = router;
