const assert = require("node:assert/strict");
const request = require("supertest");

process.env.CLIENT_ORIGIN = "http://localhost:5173";
process.env.JWT_SECRET = "test-jwt-secret-value-with-at-least-32-characters";
process.env.AUTH_COOKIE_NAME = "admin_access_token";

const app = require("../src/app");

test("partner-facing APIs allow any browser origin", async () => {
  const response = await request(app)
    .options("/api/v1/publisher/script")
    .set("Origin", "https://partner-landing-page.example")
    .set("Access-Control-Request-Method", "POST");

  assert.equal(response.status, 204);
  assert.equal(
    response.headers["access-control-allow-origin"],
    "https://partner-landing-page.example",
  );
});

test("admin APIs reject unapproved browser origins", async () => {
  const response = await request(app)
    .options("/api/admin/users")
    .set("Origin", "https://unknown-admin.example")
    .set("Access-Control-Request-Method", "GET");

  assert.equal(response.status, 403);
});
