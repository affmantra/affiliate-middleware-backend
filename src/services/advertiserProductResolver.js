const { env } = require("../config/env");

const PRODUCT_CONFIGS = {
  1: {
    id: "1",
    provider: "default",
    scriptUrl: env.advertiserScriptUrl,
    scriptApiKey: env.advertiserScriptApiKey,
    subscriptionUrl: env.advertiserSubscriptionUrl,
    subscriptionApiKey: env.advertiserSubscriptionApiKey,
    networkName: env.advertiserNetworkName,
  },
};

function normalizeProductId(productId) {
  return String(productId || "1").trim();
}

function resolveAdvertiserProduct(productId) {
  const normalizedProductId = normalizeProductId(productId);
  return PRODUCT_CONFIGS[normalizedProductId] || null;
}

module.exports = { normalizeProductId, resolveAdvertiserProduct };
