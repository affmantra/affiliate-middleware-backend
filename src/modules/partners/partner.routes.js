const express = require("express");
const { authenticateAdmin, authorizeRoles } = require("../../middlewares/authMiddleware");
const { asyncHandler } = require("../../utils/asyncHandler");
const partnerController = require("./partner.controller");
const {
  validateCreatePartner,
  validateListPartners,
  validatePartnerId,
  validateUpdatePartner,
  validateUpdatePartnerStatus,
} = require("./partner.validation");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin", "admin"));

router.get("/", validateListPartners, asyncHandler(partnerController.listPartners));
router.post("/", validateCreatePartner, asyncHandler(partnerController.createPartner));
router.get(
  "/:id",
  validatePartnerId,
  asyncHandler(partnerController.getPartnerDetails),
);
router.put(
  "/:id",
  validatePartnerId,
  validateUpdatePartner,
  asyncHandler(partnerController.updatePartner),
);
router.patch(
  "/:id/status",
  validatePartnerId,
  validateUpdatePartnerStatus,
  asyncHandler(partnerController.updatePartnerStatus),
);
router.post(
  "/:id/regenerate-api-key",
  validatePartnerId,
  asyncHandler(partnerController.regenerateApiKey),
);

module.exports = router;
