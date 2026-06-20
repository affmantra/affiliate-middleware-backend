const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");
const Lead = require("../src/models/leadModel");
const Postback = require("../src/models/postbackModel");
const Session = require("../src/models/sessionModel");
const Subscription = require("../src/models/subscriptionModel");

const originalLeadFindOne = Lead.findOne;
const originalLeadFindByIdAndUpdate = Lead.findByIdAndUpdate;
const originalPostbackFindOne = Postback.findOne;
const originalPostbackCreate = Postback.create;
const originalPostbackFindByIdAndUpdate = Postback.findByIdAndUpdate;
const originalSessionFindOne = Session.findOne;
const originalSessionFindByIdAndUpdate = Session.findByIdAndUpdate;
const originalSubscriptionFindOne = Subscription.findOne;
const originalSubscriptionFindByIdAndUpdate = Subscription.findByIdAndUpdate;

function chainResult(value) {
  return {
    sort: async () => value,
  };
}

afterEach(() => {
  Lead.findOne = originalLeadFindOne;
  Lead.findByIdAndUpdate = originalLeadFindByIdAndUpdate;
  Postback.findOne = originalPostbackFindOne;
  Postback.create = originalPostbackCreate;
  Postback.findByIdAndUpdate = originalPostbackFindByIdAndUpdate;
  Session.findOne = originalSessionFindOne;
  Session.findByIdAndUpdate = originalSessionFindByIdAndUpdate;
  Subscription.findOne = originalSubscriptionFindOne;
  Subscription.findByIdAndUpdate = originalSubscriptionFindByIdAndUpdate;
});

test("POST /api/v1/postback/subscription validates payload", async () => {
  const response = await request(app)
    .post("/api/v1/postback/subscription")
    .send({ ema: "bad", clickid: "" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/v1/postback/subscription requires matching lead", async () => {
  Lead.findOne = () => chainResult(null);

  const response = await request(app)
    .post("/api/v1/postback/subscription?ema=966123456789&clickid=click1")
    .send({});

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "Matching lead was not found.");
});

test("POST /api/v1/postback/subscription updates conversion state", async () => {
  const partnerId = new mongoose.Types.ObjectId();
  const leadId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const postbackId = new mongoose.Types.ObjectId();
  let capturedPostback;
  let capturedLeadUpdate;
  let capturedSubscriptionUpdate;
  let capturedSessionUpdate;

  const lead = {
    _id: leadId,
    partnerId,
    sessionId,
    advertId: "advert1",
    clickId: "click1",
    msisdn: "966123456789",
  };
  const subscription = {
    _id: subscriptionId,
    leadId,
    sessionId,
    clickId: "click1",
    msisdn: "966123456789",
    subscribedAt: null,
  };
  const session = {
    _id: sessionId,
  };

  Lead.findOne = () => chainResult(lead);
  Subscription.findOne = () => chainResult(subscription);
  Session.findOne = async () => session;
  Postback.findOne = async () => null;
  Postback.create = async (payload) => {
    capturedPostback = payload;
    return { _id: postbackId, ...payload };
  };
  Lead.findByIdAndUpdate = async (id, update) => {
    capturedLeadUpdate = update;
    return { _id: id, ...lead, ...update };
  };
  Subscription.findByIdAndUpdate = async (id, update) => {
    capturedSubscriptionUpdate = update;
    return { _id: id, ...subscription, ...update };
  };
  Session.findByIdAndUpdate = async (id, update) => {
    capturedSessionUpdate = update;
    return { _id: id, ...update };
  };
  Postback.findByIdAndUpdate = async () => ({});

  const response = await request(app)
    .post("/api/v1/postback/subscription")
    .send({ ema: "966123456789", clickid: "click1" });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "processed");
  assert.equal(capturedPostback.eventId, "subscription:click1:966123456789");
  assert.equal(capturedPostback.signatureStatus, "not_provided");
  assert.equal(capturedLeadUpdate.status, "subscribed");
  assert.equal(capturedSubscriptionUpdate.status, "active");
  assert.equal(capturedSessionUpdate.status, "converted");
});

test("GET /api/v1/postback/subscription updates conversion state from query params", async () => {
  const partnerId = new mongoose.Types.ObjectId();
  const leadId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const postbackId = new mongoose.Types.ObjectId();
  let capturedPostback;

  const lead = {
    _id: leadId,
    partnerId,
    sessionId,
    advertId: "advert1",
    clickId: "345333345444",
    msisdn: "966123456789",
  };
  const subscription = {
    _id: subscriptionId,
    leadId,
    sessionId,
    clickId: "345333345444",
    msisdn: "966123456789",
    subscribedAt: null,
  };

  Lead.findOne = () => chainResult(lead);
  Subscription.findOne = () => chainResult(subscription);
  Session.findOne = async () => ({ _id: sessionId });
  Postback.findOne = async () => null;
  Postback.create = async (payload) => {
    capturedPostback = payload;
    return { _id: postbackId, ...payload };
  };
  Lead.findByIdAndUpdate = async (id, update) => ({ _id: id, ...lead, ...update });
  Subscription.findByIdAndUpdate = async (id, update) => ({
    _id: id,
    ...subscription,
    ...update,
  });
  Session.findByIdAndUpdate = async () => ({});
  Postback.findByIdAndUpdate = async () => ({});

  const response = await request(app).get(
    "/api/v1/postback/subscription?ema=966123456789&clickid=345333345444",
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "processed");
  assert.equal(capturedPostback.eventId, "subscription:345333345444:966123456789");
});

test("POST /api/v1/postback/subscription prevents duplicates", async () => {
  const leadId = new mongoose.Types.ObjectId();
  const sessionId = new mongoose.Types.ObjectId();
  const subscriptionId = new mongoose.Types.ObjectId();
  const postbackId = new mongoose.Types.ObjectId();

  Lead.findOne = () =>
    chainResult({
      _id: leadId,
      partnerId: new mongoose.Types.ObjectId(),
      sessionId,
      advertId: "advert1",
      clickId: "click1",
      msisdn: "966123456789",
    });
  Subscription.findOne = () =>
    chainResult({
      _id: subscriptionId,
      leadId,
      sessionId,
      clickId: "click1",
      msisdn: "966123456789",
    });
  Session.findOne = async () => ({ _id: sessionId });
  Postback.findOne = async () => ({
    _id: postbackId,
    status: "processed",
  });

  const response = await request(app)
    .post("/api/v1/postback/subscription")
    .send({ ema: "966123456789", clickid: "click1" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.duplicate, true);
  assert.equal(response.body.data.status, "processed");
});
