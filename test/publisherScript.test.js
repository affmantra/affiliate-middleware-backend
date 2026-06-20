const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";
process.env.ADVERTISER_SCRIPT_URL = "";

const app = require("../src/app");
const Partner = require("../src/modules/partners/partner.model");
const Session = require("../src/models/sessionModel");
const { hashApiKey } = require("../src/modules/partners/partner.service");

const originalPartnerFindOne = Partner.findOne;
const originalSessionFindOneAndUpdate = Session.findOneAndUpdate;

afterEach(() => {
  Partner.findOne = originalPartnerFindOne;
  Session.findOneAndUpdate = originalSessionFindOneAndUpdate;
});

test("POST /api/v1/publisher/script requires an API key", async () => {
  const response = await request(app)
    .post("/api/v1/publisher/script")
    .send({ buttonId: "#subb", clickId: "click1", productId: "1" });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("POST /api/v1/publisher/script validates JSON body", async () => {
  const apiKey = "pk_live_test_script_key";
  const partnerId = new mongoose.Types.ObjectId();

  Partner.findOne = () => ({
    select: async () => ({
      _id: partnerId,
      name: "Publisher",
      email: "publisher@example.com",
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPreview: "pk_live_xxxxx_key",
      status: "active",
    }),
  });

  const response = await request(app)
    .post("/api/v1/publisher/script")
    .set("x-api-key", apiKey)
    .send({ buttonId: "#subb", productId: "1" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/v1/publisher/script stores session and returns advertiser response", async () => {
  const apiKey = "pk_live_test_script_key";
  const partnerId = new mongoose.Types.ObjectId();
  let capturedQuery;
  let capturedUpdate;

  Partner.findOne = () => ({
    select: async () => ({
      _id: partnerId,
      name: "Publisher",
      email: "publisher@example.com",
      apiKeyHash: hashApiKey(apiKey),
      apiKeyPreview: "pk_live_xxxxx_key",
      status: "active",
    }),
  });

  Session.findOneAndUpdate = async (query, update) => {
    capturedQuery = query;
    capturedUpdate = update;

    return {
      _id: new mongoose.Types.ObjectId(),
      ...update,
    };
  };

  const response = await request(app)
    .post("/api/v1/publisher/script")
    .set("x-api-key", apiKey)
    .set("user-agent", "supertest")
    .send({ buttonId: "#subb", clickId: "click1", productId: "1", source: "test" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.advertId, "mock-advert-id");
  assert.equal(response.body.data.productId, "1");
  assert.equal(response.body.data.clickId, "click1");
  assert.equal(response.body.data.buttonId, "#subb");
  assert.equal(response.body.data.script, "");
  assert.equal(response.body.data.scriptAvailable, undefined);
  assert.equal(response.body.data.warning, undefined);
  assert.equal(response.body.data.provider, undefined);
  assert.equal(response.body.data.launchEvent, undefined);
  assert.equal(String(capturedQuery.partnerId), String(partnerId));
  assert.equal(capturedQuery.productId, "1");
  assert.equal(capturedQuery.clickId, "click1");
  assert.equal(capturedUpdate.productId, "1");
  assert.equal(capturedUpdate.advertId, "mock-advert-id");
  assert.equal(capturedUpdate.status, "script_served");
  assert.equal(capturedUpdate.requestData.body.source, "test");
  assert.equal(capturedUpdate.requestData.body.buttonId, "#subb");
  assert.equal(capturedUpdate.responseData.provider, "default");
});
