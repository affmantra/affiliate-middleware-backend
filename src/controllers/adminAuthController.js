const { authenticateAdmin: loginAdmin, toPublicAdmin } = require("../services/authService");
const { recordAdminAction } = require("../services/auditLogService");
const {
  clearAuthCookie,
  generateAccessToken,
  setAuthCookie,
} = require("../services/tokenService");

async function login(req, res) {
  let admin;

  try {
    admin = await loginAdmin(req.body.email, req.body.password);
  } catch (error) {
    await recordAdminAction(req, {
      adminEmail: req.body.email,
      action: "login_failed",
      entityType: "auth",
      outcome: "failed",
      metadata: { reason: error.message },
    });
    throw error;
  }

  const token = generateAccessToken(admin);

  setAuthCookie(res, token);

  await recordAdminAction(req, {
    adminId: admin._id,
    adminEmail: admin.email,
    action: "login_success",
    entityType: "auth",
    outcome: "success",
  });

  res.status(200).json({
    success: true,
    data: { admin: toPublicAdmin(admin) },
  });
}

function me(req, res) {
  res.status(200).json({
    success: true,
    data: { admin: toPublicAdmin(req.admin) },
  });
}

async function logout(req, res) {
  if (req.admin) {
    await recordAdminAction(req, {
      action: "logout",
      entityType: "auth",
      outcome: "success",
    });
  }

  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    data: { message: "Logged out successfully." },
  });
}

module.exports = { login, logout, me };
