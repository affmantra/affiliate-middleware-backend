const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const { hashPassword } = require("../src/services/passwordService");

const originalFindOne = Admin.findOne;

test.afterEach(() => {
  Admin.findOne = originalFindOne;
});

test("POST /api/admin/auth/login validates request inputs", async () => {
  const response = await request(app).post("/api/admin/auth/login").send({
    email: "invalid",
    password: "short",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("login rejects an incorrect password without setting a cookie", async () => {
  const passwordHash = await hashPassword("correct-password");
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    status: "active",
    passwordHash,
  };

  Admin.findOne = () => ({
    select: async () => admin,
  });

  const response = await request(app).post("/api/admin/auth/login").send({
    email: "admin@example.com",
    password: "wrong-password",
  });

  assert.equal(response.status, 401);
  assert.equal(response.headers["set-cookie"], undefined);
});

test("login creates an HTTP-only cookie and me returns the authenticated admin", async () => {
  const passwordHash = await hashPassword("secure-password");
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    name: "System Admin",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    passwordHash,
    save: async () => admin,
  };

  Admin.findOne = () => ({
    select: async () => admin,
  });

  const loginResponse = await request(app).post("/api/admin/auth/login").send({
    email: "admin@example.com",
    password: "secure-password",
  });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.data.admin.email, "admin@example.com");
  assert.match(loginResponse.headers["set-cookie"][0], /HttpOnly/);

  const cookie = loginResponse.headers["set-cookie"][0].split(";")[0];
  Admin.findOne = async () => admin;

  const meResponse = await request(app)
    .get("/api/admin/auth/me")
    .set("Cookie", cookie);

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.data.admin.name, "System Admin");
});

test("protected admin auth route rejects requests without a cookie", async () => {
  const response = await request(app).get("/api/admin/auth/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.message, "Authentication required.");
});

test("logout clears the authentication cookie", async () => {
  const response = await request(app).post("/api/admin/auth/logout");

  assert.equal(response.status, 200);
  assert.match(response.headers["set-cookie"][0], /admin_access_token=;/);
});
