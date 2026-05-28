const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const request = require("supertest");

process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");
const Admin = require("../src/models/adminModel");
const { generateAccessToken } = require("../src/services/tokenService");

const originalFind = Admin.find;
const originalFindOne = Admin.findOne;
const originalFindOneAndUpdate = Admin.findOneAndUpdate;
const originalCreate = Admin.create;

function adminCookie(admin) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

test.afterEach(() => {
  Admin.find = originalFind;
  Admin.findOne = originalFindOne;
  Admin.findOneAndUpdate = originalFindOneAndUpdate;
  Admin.create = originalCreate;
});

test("GET /api/admin/users requires a super admin", async () => {
  const admin = {
    _id: new mongoose.Types.ObjectId(),
    name: "Panel Admin",
    email: "admin@example.com",
    role: "admin",
    status: "active",
  };

  Admin.findOne = async () => admin;

  const response = await request(app)
    .get("/api/admin/users")
    .set("Cookie", adminCookie(admin));

  assert.equal(response.status, 403);
});

test("GET /api/admin/users lists safe admin fields", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    name: "System Admin",
    email: "system@example.com",
    role: "super_admin",
    status: "active",
  };

  Admin.findOne = async () => superAdmin;
  Admin.find = () => ({
    sort: () => ({
      select: () => ({
        lean: async () => [
          {
            _id: superAdmin._id,
            name: superAdmin.name,
            email: superAdmin.email,
            role: superAdmin.role,
            status: superAdmin.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    }),
  });

  const response = await request(app)
    .get("/api/admin/users")
    .set("Cookie", adminCookie(superAdmin));

  assert.equal(response.status, 200);
  assert.equal(response.body.data.users[0].email, "system@example.com");
  assert.equal(response.body.data.users[0].passwordHash, undefined);
});

test("POST /api/admin/users validates create payload", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    role: "super_admin",
    status: "active",
  };

  Admin.findOne = async () => superAdmin;

  const response = await request(app)
    .post("/api/admin/users")
    .set("Cookie", adminCookie(superAdmin))
    .send({
      name: "A",
      email: "bad-email",
      password: "short",
      role: "owner",
    });

  assert.equal(response.status, 400);
});

test("POST /api/admin/users creates a user with hashed password", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    role: "super_admin",
    status: "active",
  };

  Admin.findOne = async () => null;
  Admin.findOne = async (query) => {
    if (query._id) return superAdmin;
    return null;
  };
  Admin.create = async (payload) => ({
    _id: new mongoose.Types.ObjectId(),
    name: payload.name,
    email: payload.email,
    role: payload.role,
    status: payload.status,
    passwordHash: payload.passwordHash,
  });

  const response = await request(app)
    .post("/api/admin/users")
    .set("Cookie", adminCookie(superAdmin))
    .send({
      name: "Support User",
      email: "support@example.com",
      password: "secure-password",
      role: "support",
      status: "active",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.user.email, "support@example.com");
  assert.equal(response.body.data.user.passwordHash, undefined);
});

test("PATCH /api/admin/users/:id/status updates another admin status", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    role: "super_admin",
    status: "active",
  };
  const targetAdminId = new mongoose.Types.ObjectId();

  Admin.findOne = async () => superAdmin;
  Admin.findOneAndUpdate = async (query, update) => ({
    _id: query._id,
    name: "Support User",
    email: "support@example.com",
    role: "support",
    status: update.status,
  });

  const response = await request(app)
    .patch(`/api/admin/users/${targetAdminId}/status`)
    .set("Cookie", adminCookie(superAdmin))
    .send({ status: "blocked" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.status, "blocked");
});

test("PATCH /api/admin/users/:id/password updates another admin password", async () => {
  const superAdmin = {
    _id: new mongoose.Types.ObjectId(),
    role: "super_admin",
    status: "active",
  };
  const targetAdminId = new mongoose.Types.ObjectId();
  let passwordHash;

  Admin.findOne = async () => superAdmin;
  Admin.findOneAndUpdate = async (query, update) => {
    passwordHash = update.passwordHash;

    return {
      _id: query._id,
      name: "Support User",
      email: "support@example.com",
      role: "support",
      status: "active",
    };
  };

  const response = await request(app)
    .patch(`/api/admin/users/${targetAdminId}/password`)
    .set("Cookie", adminCookie(superAdmin))
    .send({ password: "new-secure-password" });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.email, "support@example.com");
  assert.notEqual(passwordHash, "new-secure-password");
  assert.match(passwordHash, /^\$2/);
});
