const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../src/app");

test("GET /health returns service status", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.status, "ok");
});

test("unknown route uses the global error handler", async () => {
  const response = await request(app).get("/missing");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.match(response.body.error.message, /Route not found/);
});
