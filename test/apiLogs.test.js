const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const ApiLog = require("../src/models/apiLogModel");
const { generateAccessToken } = require("../src/services/tokenService");

const originalAdminFindOne = Admin.findOne;
const originalApiLogFind = ApiLog.find;
const originalApiLogCountDocuments = ApiLog.countDocuments;

function makeAdmin() {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: "super@example.com",
    role: "super_admin",
    status: "active",
  };
}

function adminCookie(admin) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

afterEach(() => {
  Admin.findOne = originalAdminFindOne;
  ApiLog.find = originalApiLogFind;
  ApiLog.countDocuments = originalApiLogCountDocuments;
});

test("GET /api/admin/api-logs supports partner-facing category filter", async () => {
  const admin = makeAdmin();
  const logId = new mongoose.Types.ObjectId();
  let capturedFilter;

  Admin.findOne = async () => admin;
  ApiLog.find = (filter) => {
    capturedFilter = filter;

    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            select: () => ({
              lean: async () => [
                {
                  _id: logId,
                  createdAt: new Date(),
                  direction: "inbound",
                  endpoint: "/api/v1/publisher/script",
                  ipAddress: "127.0.0.1",
                  latency: 10,
                  method: "POST",
                  requestId: "req_1",
                  status: "success",
                  statusCode: 200,
                },
              ],
            }),
          }),
        }),
      }),
    };
  };
  ApiLog.countDocuments = async () => 1;

  const response = await request(app)
    .get("/api/admin/api-logs?category=partner&dateFrom=2026-06-18&dateTo=2026-06-18&limit=100")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.logs[0].category, "partner");
  assert.equal(capturedFilter.direction, "inbound");
  assert.equal(
    capturedFilter.endpoint.$regex,
    "^/api/v[0-9]+/(publisher|postback)(/|$)",
  );
  assert.deepEqual(capturedFilter.createdAt, {
    $gte: new Date("2026-06-18T00:00:00.000"),
    $lte: new Date("2026-06-18T23:59:59.999"),
  });
});
