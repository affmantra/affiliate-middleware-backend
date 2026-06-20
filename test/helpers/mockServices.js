const mongoose = require("mongoose");
const { generateAccessToken } = require("../../src/services/tokenService");
const { hashApiKey } = require("../../src/modules/partners/partner.service");

function makeAdmin(role = "admin") {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: `${role}@example.com`,
    role,
    status: "active",
  };
}

function adminCookie(admin = makeAdmin()) {
  const token = generateAccessToken(admin);
  return `${process.env.AUTH_COOKIE_NAME}=${token}`;
}

function makePartner(apiKey = "pk_live_test_key") {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: "Publisher",
    email: "publisher@example.com",
    apiKeyHash: hashApiKey(apiKey),
    apiKeyPreview: "pk_live_xxxxx_key",
    status: "active",
  };
}

module.exports = {
  adminCookie,
  makeAdmin,
  makePartner,
};
