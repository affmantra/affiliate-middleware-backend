const express = require("express");
const { login, logout, me } = require("../controllers/adminAuthController");
const {
  authenticateAdmin,
  optionallyAuthenticateAdmin,
} = require("../middlewares/authMiddleware");
const { validateAdminLogin } = require("../middlewares/validateRequest");
const { asyncHandler } = require("../utils/asyncHandler");

const router = express.Router();

router.post("/login", validateAdminLogin, asyncHandler(login));
router.get("/me", authenticateAdmin, me);
router.post("/logout", optionallyAuthenticateAdmin, asyncHandler(logout));

module.exports = router;
