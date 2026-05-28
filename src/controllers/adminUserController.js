const {
  createAdminUser,
  getAdminUser,
  listAdminUsers,
  updateAdminUserPassword,
  updateAdminUserStatus,
} = require("../services/adminUserService");
const { recordAdminAction } = require("../services/auditLogService");

async function listUsers(req, res) {
  const users = await listAdminUsers();

  res.status(200).json({
    success: true,
    data: { users },
  });
}

async function getUser(req, res) {
  const user = await getAdminUser(req.params.id);

  res.status(200).json({
    success: true,
    data: { user },
  });
}

async function createUser(req, res) {
  const user = await createAdminUser(req.body);

  await recordAdminAction(req, {
    action: "admin_user_created",
    entityType: "user",
    entityId: user.id,
    outcome: "success",
    metadata: {
      targetEmail: user.email,
      targetRole: user.role,
      targetStatus: user.status,
    },
  });

  res.status(201).json({
    success: true,
    data: { user },
  });
}

async function updateUserPassword(req, res) {
  const user = await updateAdminUserPassword(req.params.id, req.body.password);

  await recordAdminAction(req, {
    action: "admin_user_password_updated",
    entityType: "user",
    entityId: user.id,
    outcome: "success",
    metadata: {
      targetEmail: user.email,
    },
  });

  res.status(200).json({
    success: true,
    data: { user },
  });
}

async function updateUserStatus(req, res) {
  const user = await updateAdminUserStatus(
    req.params.id,
    req.body.status,
    req.admin._id,
  );

  await recordAdminAction(req, {
    action: "admin_user_status_updated",
    entityType: "user",
    entityId: user.id,
    outcome: "success",
    metadata: {
      targetEmail: user.email,
      targetStatus: user.status,
    },
  });

  res.status(200).json({
    success: true,
    data: { user },
  });
}

module.exports = { createUser, getUser, listUsers, updateUserPassword, updateUserStatus };
