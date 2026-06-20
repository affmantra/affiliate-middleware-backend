const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const AdminAuditLog = require("../src/models/adminAuditLogModel");
const { generateAccessToken } = require("../src/services/tokenService");
const { parseUserAgent } = require("../src/utils/requestContext");

const originalAdminFindOne = Admin.findOne;
const originalAuditFind = AdminAuditLog.find;

function adminCookie(admin) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

afterEach(() => {
  Admin.findOne = originalAdminFindOne;
  AdminAuditLog.find = originalAuditFind;
});

test("GET /api/admin/audit-logs requires a super admin", async () => {
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    email: "admin@example.com",
    role: "admin",
    status: "active",
  };

  Admin.findOne = async () => admin;

  const response = await request(app)
    .get("/api/admin/audit-logs")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 403);
});

test("GET /api/admin/audit-logs returns recent activity", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    email: "system@example.com",
    role: "super_admin",
    status: "active",
  };

  Admin.findOne = async () => superAdmin;
  AdminAuditLog.find = (filter) => {
    assert.deepEqual(filter, { adminId: superAdmin._id.toString() });

    return {
    sort: () => ({
      limit: () => ({
        select: () => ({
          lean: async () => [
            {
              _id: new mongoose.Types.ObjectId(),
              adminId: superAdmin._id,
              adminEmail: superAdmin.email,
              action: "login_success",
              entityType: "auth",
              outcome: "success",
              ipAddress: "203.0.113.10",
              browser: "Chrome",
              device: "Desktop",
              method: "POST",
              path: "/api/admin/auth/login",
              createdAt: new Date(),
            },
          ],
        }),
      }),
    }),
    };
  };

  const response = await request(app)
    .get(`/api/admin/audit-logs?limit=25&adminId=${superAdmin._id}`)
    .set("Cookie", adminCookie(superAdmin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.logs[0].action, "login_success");
  assert.equal(response.body.data.logs[0].ipAddress, "203.0.113.10");
});

test("GET /api/admin/audit-logs validates limit", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    email: "system@example.com",
    role: "super_admin",
    status: "active",
  };

  Admin.findOne = async () => superAdmin;

  const response = await request(app)
    .get("/api/admin/audit-logs?limit=500")
    .set("Cookie", adminCookie(superAdmin));

  assert.equal(response.status, 400);
});

test("parseUserAgent detects common browser and device details", () => {
  const result = parseUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  );

  assert.equal(result.browser, "Safari");
  assert.equal(result.device, "Mobile");
});
