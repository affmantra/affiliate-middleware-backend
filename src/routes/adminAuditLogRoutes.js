const express = require("express");
const { listAuditLogs } = require("../controllers/adminAuditLogController");
const { authenticateAdmin, authorizeRoles } = require("../middlewares/authMiddleware");
const { validateAuditLogQuery } = require("../middlewares/validateRequest");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin"));

router.get("/", validateAuditLogQuery, asyncHandler(listAuditLogs));

module.exports = router;
