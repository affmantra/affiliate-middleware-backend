const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const Partner = require("../src/modules/partners/partner.model");
const { generateAccessToken } = require("../src/services/tokenService");

const originalAdminFindOne = Admin.findOne;
const originalPartnerFind = Partner.find;
const originalPartnerFindOne = Partner.findOne;
const originalPartnerCreate = Partner.create;
const originalPartnerCountDocuments = Partner.countDocuments;
const originalPartnerFindOneAndUpdate = Partner.findOneAndUpdate;

function adminCookie(admin) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

function makeAdmin(role = "admin") {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: "admin@example.com",
    role,
    status: "active",
  };
}

afterEach(() => {
  Admin.findOne = originalAdminFindOne;
  Partner.find = originalPartnerFind;
  Partner.findOne = originalPartnerFindOne;
  Partner.create = originalPartnerCreate;
  Partner.countDocuments = originalPartnerCountDocuments;
  Partner.findOneAndUpdate = originalPartnerFindOneAndUpdate;
});

test("partner routes require admin authentication", async () => {
  const response = await request(app).get("/api/v1/admin/partners");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("POST /api/v1/admin/partners validates required fields", async () => {
  const admin = makeAdmin();
  Admin.findOne = async () => admin;

  const response = await request(app)
    .post("/api/v1/admin/partners")
    .set("Cookie", adminCookie(admin))
    .send({
      email: "bad-email",
      website: "not-a-url",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message);
});

test("POST /api/v1/admin/partners creates partner and returns raw API key once", async () => {
  const admin = makeAdmin();
  let createdPayload;

  Admin.findOne = async () => admin;
  Partner.findOne = async () => null;
  Partner.create = async (payload) => {
    createdPayload = payload;

    return {
      _id: new mongoose.Types.ObjectId(),
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  const response = await request(app)
    .post("/api/v1/admin/partners")
    .set("Cookie", adminCookie(admin))
    .send({
      name: "Publisher One",
      companyName: "Publisher Co",
      email: "publisher@example.com",
      website: "https://publisher.example.com",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.match(response.body.data.apiKey, /^pk_live_/);
  assert.equal(response.body.data.partner.apiKeyHash, undefined);
  assert.notEqual(createdPayload.apiKeyHash, response.body.data.apiKey);
  assert.match(createdPayload.apiKeyHash, /^[a-f0-9]{64}$/);
});

test("POST /api/v1/admin/partners rejects duplicate email", async () => {
  const admin = makeAdmin();

  Admin.findOne = async () => admin;
  Partner.findOne = async () => ({ _id: new mongoose.Types.ObjectId() });

  const response = await request(app)
    .post("/api/v1/admin/partners")
    .set("Cookie", adminCookie(admin))
    .send({
      name: "Publisher One",
      email: "publisher@example.com",
    });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, "A partner with this email already exists.");
});

test("GET /api/v1/admin/partners supports search, status, and pagination", async () => {
  const admin = makeAdmin();
  let capturedFindFilter;

  Admin.findOne = async () => admin;
  Partner.find = (filter) => {
    capturedFindFilter = filter;

    return {
      sort: () => ({
        skip: (skip) => ({
          limit: (limit) => ({
            select: () => ({
              lean: async () => [
                {
                  _id: new mongoose.Types.ObjectId(),
                  name: "Publisher One",
                  companyName: "Publisher Co",
                  email: "publisher@example.com",
                  apiKeyPreview: "pk_live_xxxxx1234",
                  status: "active",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  skip,
                  limit,
                },
              ],
            }),
          }),
        }),
      }),
    };
  };
  Partner.countDocuments = async () => 1;

  const response = await request(app)
    .get("/api/v1/admin/partners?search=publisher&status=active&page=2&limit=5")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.partners.length, 1);
  assert.equal(response.body.data.pagination.page, 2);
  assert.equal(response.body.data.pagination.limit, 5);
  assert.equal(capturedFindFilter.status, "active");
  assert.ok(capturedFindFilter.$or);
});

test("PATCH /api/v1/admin/partners/:id/status updates partner status", async () => {
  const admin = makeAdmin();
  const partnerId = new mongoose.Types.ObjectId();
  let capturedUpdate;

  Admin.findOne = async () => admin;
  Partner.findOneAndUpdate = async (query, update) => {
    capturedUpdate = update;

    return {
      _id: query._id,
      name: "Publisher One",
      email: "publisher@example.com",
      apiKeyPreview: "pk_live_xxxxx1234",
      status: update.status,
    };
  };

  const response = await request(app)
    .patch(`/api/v1/admin/partners/${partnerId}/status`)
    .set("Cookie", adminCookie(admin))
    .send({ status: "blocked" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.partner.status, "blocked");
  assert.equal(capturedUpdate.status, "blocked");
});

test("POST /api/v1/admin/partners/:id/regenerate-api-key replaces API key hash", async () => {
  const admin = makeAdmin();
  const partnerId = new mongoose.Types.ObjectId();
  let capturedUpdate;

  Admin.findOne = async () => admin;
  Partner.findOneAndUpdate = async (query, update) => {
    capturedUpdate = update;

    return {
      _id: query._id,
      name: "Publisher One",
      email: "publisher@example.com",
      apiKeyHash: update.apiKeyHash,
      apiKeyPreview: update.apiKeyPreview,
      status: "active",
    };
  };

  const response = await request(app)
    .post(`/api/v1/admin/partners/${partnerId}/regenerate-api-key`)
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 200);
  assert.match(response.body.data.apiKey, /^pk_live_/);
  assert.equal(response.body.data.partner.apiKeyHash, undefined);
  assert.match(capturedUpdate.apiKeyHash, /^[a-f0-9]{64}$/);
});
