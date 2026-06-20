const express = require("express");
const { authenticateAdmin, authorizeRoles } = require("../../middlewares/authMiddleware");
const { asyncHandler } = require("../../utils/asyncHandler");
const queueMonitorController = require("./queueMonitor.controller");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin", "admin"));

router.get("/", asyncHandler(queueMonitorController.overview));

module.exports = router;
