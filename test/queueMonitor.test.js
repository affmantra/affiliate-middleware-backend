const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";
process.env.QUEUES_ENABLED = "false";

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const { generateAccessToken } = require("../src/services/tokenService");

const originalAdminFindOne = Admin.findOne;

function adminCookie(admin) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

function makeAdmin(role = "admin") {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: `${role}@example.com`,
    role,
    status: "active",
  };
}

afterEach(() => {
  Admin.findOne = originalAdminFindOne;
});

test("GET /api/admin/queues returns disabled queue overview without Redis", async () => {
  const admin = makeAdmin();
  Admin.findOne = async () => admin;

  const response = await request(app)
    .get("/api/admin/queues")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.enabled, false);
  assert.deepEqual(
    response.body.data.queues.map((queue) => queue.name).sort(),
    ["advertiserRetryQueue", "analyticsQueue", "apiLogsQueue"].sort(),
  );
  assert.equal(response.body.data.queues[0].counts.waiting, 0);
});
