const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";
process.env.ADVERTISER_NETWORK_NAME = "test";
process.env.ADVERTISER_SUBSCRIPTION_URL = "";

const app = require("../src/app");
const Lead = require("../src/models/leadModel");
const Partner = require("../src/modules/partners/partner.model");
const Session = require("../src/models/sessionModel");
const Subscription = require("../src/models/subscriptionModel");
const { hashApiKey } = require("../src/modules/partners/partner.service");

const originalPartnerFindOne = Partner.findOne;
const originalSessionFindOne = Session.findOne;
const originalSessionFindByIdAndUpdate = Session.findByIdAndUpdate;
const originalLeadCreate = Lead.create;
const originalLeadFindByIdAndUpdate = Lead.findByIdAndUpdate;
const originalSubscriptionCreate = Subscription.create;

function mockPartner(apiKey, partnerId = new mongoose.Types.ObjectId()) {
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

  return partnerId;
}

afterEach(() => {
  Partner.findOne = originalPartnerFindOne;
  Session.findOne = originalSessionFindOne;
  Session.findByIdAndUpdate = originalSessionFindByIdAndUpdate;
  Lead.create = originalLeadCreate;
  Lead.findByIdAndUpdate = originalLeadFindByIdAndUpdate;
  Subscription.create = originalSubscriptionCreate;
});

test("POST /api/v1/publisher/subscribe requires an API key", async () => {
  const response = await request(app)
    .post("/api/v1/publisher/subscribe")
    .send({
      advertId: "mock-advert-id",
      clickId: "click1",
      productId: "1",
      msisdn: "966123456789",
    });

  assert.equal(response.status, 401);
});

test("POST /api/v1/publisher/subscribe requires a matching session", async () => {
  const apiKey = "pk_live_test_subscription_key";
  mockPartner(apiKey);
  Session.findOne = async () => null;

  const response = await request(app)
    .post("/api/v1/publisher/subscribe")
    .set("x-api-key", apiKey)
    .send({
      advertId: "mock-advert-id",
      clickId: "click1",
      productId: "1",
      msisdn: "966123456789",
    });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Matching script session was not found.");
});

test("POST /api/v1/publisher/subscribe creates lead and subscription then returns redirect", async () => {
  const apiKey = "pk_live_test_subscription_key";
  const partnerId = mockPartner(apiKey);
  const sessionId = new mongoose.Types.ObjectId();
  const leadId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  let capturedLead;
  let capturedLeadUpdate;
  let capturedSubscription;

  Session.findOne = async () => ({
    _id: sessionId,
    partnerId,
    advertId: "mock-advert-id",
    clickId: "click1",
    productId: "1",
  });
  Session.findByIdAndUpdate = async () => ({});
  Lead.create = async (payload) => {
    capturedLead = payload;
    return {
      _id: leadId,
      ...payload,
    };
  };
  Lead.findByIdAndUpdate = async (id, update) => {
    capturedLeadUpdate = update;
    return {
      _id: id,
      ...capturedLead,
      ...update,
    };
  };
  Subscription.create = async (payload) => {
    capturedSubscription = payload;
    return {
      _id: subscriptionId,
      ...payload,
    };
  };

  const response = await request(app)
    .post("/api/v1/publisher/subscribe")
    .set("x-api-key", apiKey)
    .send({
      advertId: "mock-advert-id",
      clickId: "click1",
      productId: "1",
      msisdn: "966123456789",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.redirectUrl, "https://lp.stc.com.sa/api/a/mock");
  assert.equal(response.body.data.userId, "mock-user-id");
  assert.equal(String(capturedLead.partnerId), String(partnerId));
  assert.equal(capturedLead.productId, "1");
  assert.equal(capturedLead.status, "processing");
  assert.equal(capturedLeadUpdate.status, "processing");
  assert.equal(capturedLead.requestData.body.productId, "1");
  assert.equal(capturedLead.requestData.body.networkname, "test");
  assert.equal(capturedSubscription.productId, "1");
  assert.equal(capturedSubscription.providerReference, "mock-user-id");
  assert.equal(capturedSubscription.redirectUrl, "https://lp.stc.com.sa/api/a/mock");
});
