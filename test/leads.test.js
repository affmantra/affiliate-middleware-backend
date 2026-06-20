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
const originalApiLogFind = ApiLog.find;
const originalLeadFind = Lead.find;
const originalLeadFindById = Lead.findById;
const originalLeadCountDocuments = Lead.countDocuments;

function adminCookie(admin) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

function makeAdmin() {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: "admin@example.com",
    role: "admin",
    status: "active",
  };
}

function leadFixture() {
  return {
    _id: new mongoose.Types.ObjectId(),
    partnerId: {
      _id: new mongoose.Types.ObjectId(),
      name: "Publisher One",
      email: "publisher@example.com",
      companyName: "Publisher Co",
    },
    sessionId: new mongoose.Types.ObjectId(),
    advertId: "advert1",
    clickId: "click1",
    msisdn: "966123456789",
    provider: "foodigo",
    providerReference: "user-1",
    status: "subscribed",
    redirectUrl: "https://example.com",
    errorCode: null,
    requestData: {},
    responseData: {},
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
  };
}

afterEach(() => {
  Admin.findOne = originalAdminFindOne;
  ApiLog.find = originalApiLogFind;
  Lead.find = originalLeadFind;
  Lead.findById = originalLeadFindById;
  Lead.countDocuments = originalLeadCountDocuments;
});

test("GET /api/admin/leads lists leads with filters and pagination", async () => {
  const admin = makeAdmin();
  let capturedFilter;

  Admin.findOne = async () => admin;
  Lead.find = (filter) => {
    capturedFilter = filter;
    return {
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              lean: async () => [leadFixture()],
            }),
          }),
        }),
      }),
    };
  };
  Lead.countDocuments = async () => 1;

  const response = await request(app)
    .get("/api/admin/leads?status=subscribed&advertId=advert1&page=2&limit=5")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.leads.length, 1);
  assert.equal(response.body.data.pagination.page, 2);
  assert.equal(capturedFilter.status, "subscribed");
  assert.equal(capturedFilter.advertId, "advert1");
});

test("GET /api/admin/leads/:id returns lead details with msisdn", async () => {
  const admin = makeAdmin();
  const lead = leadFixture();
  let capturedApiLogFilter;

  Admin.findOne = async () => admin;
  Lead.findById = () => ({
    select: () => ({
      populate: () => ({
        lean: async () => lead,
      }),
    }),
  });
  ApiLog.find = (filter) => {
    capturedApiLogFilter = filter;
    return {
      sort: () => ({
        limit: () => ({
          select: () => ({
            lean: async () => [
              {
                _id: new mongoose.Types.ObjectId(),
                requestId: "outbound-request-1",
                parentRequestId: "publisher-request-1",
                endpoint: "https://api.chefrecipes.net/api/v1/foodigo/sa/stcsubscribe",
                method: "POST",
                status: "success",
                statusCode: 200,
                latency: 120,
                advertId: "advert1",
                clickId: "click1",
                body: { clickid: "click1" },
                response: { success: true },
                createdAt: new Date("2026-06-01T10:00:01.000Z"),
              },
            ],
          }),
        }),
      }),
    };
  };

  const response = await request(app)
    .get(`/api/admin/leads/${lead._id}`)
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.lead.msisdn, "966123456789");
  assert.equal(response.body.data.lead.advertiserApiLogs.length, 1);
  assert.equal(
    response.body.data.lead.advertiserApiLogs[0].endpoint,
    "https://api.chefrecipes.net/api/v1/foodigo/sa/stcsubscribe",
  );
  assert.equal(capturedApiLogFilter.direction, "outbound");
  assert.equal(capturedApiLogFilter.advertId, "advert1");
  assert.equal(capturedApiLogFilter.clickId, "click1");
});

test("GET /api/admin/leads/export returns CSV", async () => {
  const admin = makeAdmin();

  Admin.findOne = async () => admin;
  Lead.find = () => ({
    sort: () => ({
      limit: () => ({
        select: () => ({
          populate: () => ({
            lean: async () => [leadFixture()],
          }),
        }),
      }),
    }),
  });

  const response = await request(app)
    .get("/api/admin/leads/export?status=subscribed")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /text\/csv/);
  assert.match(response.text, /Publisher One/);
  assert.match(response.text, /966123456789/);
});
