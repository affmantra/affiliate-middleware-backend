const express = require("express");
const {
  createUser,
  getUser,
  listUsers,
  updateUserPassword,
  updateUserStatus,
} = require("../controllers/adminUserController");
const { authenticateAdmin, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  validateAdminUserId,
  validateCreateAdminUser,
  validateUpdateAdminUserPassword,
  validateUpdateAdminUserStatus,
} = require("../middlewares/validateRequest");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.use(authenticateAdmin);
router.use(authorizeRoles("super_admin"));

router.get("/", asyncHandler(listUsers));
router.post("/", validateCreateAdminUser, asyncHandler(createUser));
router.get("/:id", validateAdminUserId, asyncHandler(getUser));
router.patch(
  "/:id/password",
  validateAdminUserId,
  validateUpdateAdminUserPassword,
  asyncHandler(updateUserPassword),
);
router.patch(
  "/:id/status",
  validateAdminUserId,
  validateUpdateAdminUserStatus,
  asyncHandler(updateUserStatus),
);

module.exports = router;
