const express = require("express");
const { listLogs } = require("../controllers/adminApiLogController");
const { authenticateAdmin, authorizeRoles } = require("../middlewares/authMiddleware");
const { validateApiLogQuery } = require("../middlewares/validateRequest");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin"));

router.get("/", validateApiLogQuery, asyncHandler(listLogs));

module.exports = router;
