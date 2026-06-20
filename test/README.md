# Backend Testing

The backend test setup uses Jest and Supertest.

## Commands

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Test Types

- API integration tests use Supertest against the Express app.
- Fast tests mock Mongoose models and external advertiser services.
- Database integration tests can use `MONGODB_TEST_URI` with `test/helpers/testDatabase.js`.

## Current Coverage Areas

- Auth APIs
- Admin user APIs
- Partner APIs
- Publisher script API
- Publisher subscribe API
- Advertiser postback API
- Leads and analytics APIs
- Queue monitoring API
- CORS and middleware validation

## API Test Example

```js
const request = require("supertest");
const app = require("../src/app");

test("endpoint validates required input", async () => {
  const response = await request(app)
    .post("/api/v1/publisher/script")
    .send({});

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});
```

## Mock Service Example

```js
const Partner = require("../src/modules/partners/partner.model");
const { makePartner } = require("./helpers/mockServices");

const originalPartnerFindOne = Partner.findOne;

afterEach(() => {
  Partner.findOne = originalPartnerFindOne;
});

test("uses a mocked partner", async () => {
  Partner.findOne = () => ({
    select: async () => makePartner("pk_live_test_key"),
  });

  // Call the API with Supertest here.
});
```

## Database Integration Example

```js
const {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} = require("./helpers/testDatabase");

beforeAll(connectTestDatabase);
afterEach(clearTestDatabase);
afterAll(disconnectTestDatabase);
```

Only use real database integration tests when model behavior or indexes must be verified. Prefer model/service mocks for route validation and request/response behavior.
