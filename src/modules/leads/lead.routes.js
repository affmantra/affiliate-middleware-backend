const express = require("express");
const { authenticateAdmin, authorizeRoles } = require("../../middlewares/authMiddleware");
const { asyncHandler } = require("../../utils/asyncHandler");
const leadController = require("./lead.controller");
const { validateLeadId, validateListLeads } = require("./lead.validation");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin", "admin"));

router.get("/", validateListLeads, asyncHandler(leadController.list));
router.get("/export", validateListLeads, asyncHandler(leadController.exportCsv));
router.get("/:id", validateLeadId, asyncHandler(leadController.details));

module.exports = router;
