const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const ApiLog = require("../src/models/apiLogModel");
const Lead = require("../src/models/leadModel");
const { generateAccessToken } = require("../src/services/tokenService");

const originalAdminFindOne = Admin.findOne;
const originalApiLogAggregate = ApiLog.aggregate;
const originalLeadAggregate = Lead.aggregate;

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
  ApiLog.aggregate = originalApiLogAggregate;
  Lead.aggregate = originalLeadAggregate;
});

test("GET /api/admin/analytics/dashboard requires admin authentication", async () => {
  const response = await request(app).get("/api/admin/analytics/dashboard");

  assert.equal(response.status, 401);
});

test("GET /api/admin/analytics/dashboard validates date range", async () => {
  const admin = makeAdmin();
  Admin.findOne = async () => admin;

  const response = await request(app)
    .get("/api/admin/analytics/dashboard?dateFrom=2026-06-10&dateTo=2026-06-01")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 400);
  assert.match(response.body.message, /dateFrom/);
});

test("GET /api/admin/analytics/dashboard returns summary analytics", async () => {
  const admin = makeAdmin();
  let capturedApiPipeline;
  Admin.findOne = async () => admin;

  Lead.aggregate = async () => [
    {
      dailyTrends: [
        {
          date: "2026-06-01",
          failedSubscriptions: 2,
          successfulSubscriptions: 4,
          totalLeads: 10,
        },
      ],
      partnerPerformance: [
        {
          partner: {
            companyName: "Publisher Co",
            email: "publisher@example.com",
            name: "Publisher One",
          },
          partnerId: new mongoose.Types.ObjectId(),
          failedSubscriptions: 1,
          successfulSubscriptions: 4,
          totalLeads: 10,
        },
      ],
      recentActivity: [
        {
          advertId: "advert1",
          clickId: "click1",
          createdAt: new Date("2026-06-01T10:00:00.000Z"),
          id: new mongoose.Types.ObjectId(),
          partnerName: "Publisher One",
          productId: "1",
          status: "subscribed",
        },
      ],
      summary: [
        {
          failedSubscriptions: 2,
          successfulSubscriptions: 4,
          totalLeads: 10,
        },
      ],
    },
  ];
  ApiLog.aggregate = async (pipeline) => {
    capturedApiPipeline = pipeline;
    return [
    {
      metrics: [
        {
          avgLatency: 25.5,
          failedRequests: 5,
          successfulRequests: 95,
          totalRequests: 100,
        },
      ],
      requestCountsByDay: [
        {
          date: "2026-06-01",
          failedRequests: 5,
          totalRequests: 100,
        },
      ],
    },
    ];
  };

  const response = await request(app)
    .get("/api/admin/analytics/dashboard?dateFrom=2026-06-01&dateTo=2026-06-01")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.summary.totalLeads, 10);
  assert.equal(response.body.data.summary.conversionRate, 40);
  assert.equal(response.body.data.apiMetrics.errorRate, 5);
  assert.equal(response.body.data.partnerPerformance[0].partnerName, "Publisher One");
  assert.equal(response.body.data.dailyTrends[0].date, "2026-06-01");
  assert.equal(capturedApiPipeline[0].$match.direction, "inbound");
  assert.equal(
    capturedApiPipeline[0].$match.endpoint.$regex,
    "^/api/v[0-9]+/(publisher|postback)(/|$)",
  );
});
