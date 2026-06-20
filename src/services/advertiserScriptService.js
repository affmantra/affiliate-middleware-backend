const http = require("http");
const https = require("https");
const { env } = require("../config/env");
const { writeOutboundApiLogAsync } = require("./apiLogService");

function parseResponseText(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function postJson(url, { headers, body, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const payload = JSON.stringify(body);
    const isHttps = parsedUrl.protocol === "https:";
    const client = isHttps ? https : http;

    const request = client.request(
      {
        hostname: parsedUrl.hostname,
        method: "POST",
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        rejectUnauthorized: isHttps ? env.advertiserTlsRejectUnauthorized : undefined,
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let responseText = "";

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          responseText += chunk;
        });
        response.on("end", () => {
          resolve({
            body: parseResponseText(responseText),
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
          });
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Advertiser API request timed out."));
    });

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

function logAdvertiserCall({
  payload,
  endpoint,
  headers,
  body,
  responseBody,
  statusCode,
  startedAt,
  errorCode,
}) {
  writeOutboundApiLogAsync({
    parentRequestId: payload.requestId,
    partnerId: payload.partnerId || null,
    endpoint,
    method: "POST",
    headers,
    body,
    response: responseBody,
    statusCode,
    latency: Date.now() - startedAt,
    ipAddress: payload.ipAddress || null,
    advertId: payload.advertId || responseBody?.advertId || null,
    clickId: payload.clickId || payload.clickid || null,
    errorCode,
  });
}

async function callConfiguredAdvertiserScript(payload) {
  const product = payload.product || {};
  const scriptUrl = product.scriptUrl || env.advertiserScriptUrl;
  const scriptApiKey = product.scriptApiKey || env.advertiserScriptApiKey;
  const provider = product.provider || "default";

  if (!scriptUrl) {
    const mockedResponse = {
      provider,
      advertId: "mock-advert-id",
      script: "",
      message: "Advertiser script endpoint is not configured yet.",
      requestId: payload.requestId,
    };

    writeOutboundApiLogAsync({
      parentRequestId: payload.requestId,
      partnerId: payload.partnerId || null,
      endpoint: `mock://product-${payload.productId || "1"}-script`,
      method: "POST",
      body: { buttonId: payload.buttonId },
      response: mockedResponse,
      statusCode: 200,
      latency: 0,
      ipAddress: payload.ipAddress || null,
      advertId: mockedResponse.advertId,
      clickId: payload.clickId || null,
    });

    return mockedResponse;
  }

  const startedAt = Date.now();
  const headers = {
    "Content-Type": "application/json",
    ...(scriptApiKey
      ? { Authorization: `Bearer ${scriptApiKey}` }
      : {}),
  };
  const body = {
    buttonId: payload.buttonId,
  };

  try {
    const response = await postJson(scriptUrl, {
      headers,
      body,
    });

    const responseBody = response.body;

    logAdvertiserCall({
      body,
      endpoint: scriptUrl,
      headers,
      payload,
      responseBody,
      startedAt,
      statusCode: response.status,
      errorCode: response.ok ? null : "advertiser_script_failed",
    });

    if (!response.ok) {
      const error = new Error("Advertiser script API request failed.");
      error.statusCode = 502;
      error.details = responseBody;
      error.upstreamStatusCode = response.status;
      throw error;
    }

    return {
      provider,
      ...responseBody,
    };
  } catch (error) {
    if (!error.details) {
      logAdvertiserCall({
        body,
        endpoint: scriptUrl,
        headers,
        payload,
        responseBody: { message: error.message },
        startedAt,
        statusCode: null,
        errorCode: "advertiser_script_network_error",
      });
    }

    throw error;
  }
}

async function getAntiFraudScript(payload) {
  return callConfiguredAdvertiserScript(payload);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function callWithRetry(operation, { retries = 2, delayMs = 250 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(delayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function callConfiguredSubscription(payload) {
  const product = payload.product || {};
  const subscriptionUrl = product.subscriptionUrl || env.advertiserSubscriptionUrl;
  const subscriptionApiKey =
    product.subscriptionApiKey || env.advertiserSubscriptionApiKey;
  const provider = product.provider || "default";

  if (!subscriptionUrl) {
    const mockedResponse = {
      success: true,
      msisdn: payload.msisdn,
      operator: "STC",
      redirect: "https://lp.stc.com.sa/api/a/mock",
      userID: "mock-user-id",
      provider,
      mocked: true,
    };

    writeOutboundApiLogAsync({
      parentRequestId: payload.requestId,
      partnerId: payload.partnerId || null,
      endpoint: `mock://product-${payload.productId || "1"}-subscribe`,
      method: "POST",
      body: {
        action: "subscribe",
        networkname: payload.networkname,
        msisdn: payload.msisdn,
        clickid: payload.clickid,
        advertId: payload.advertId,
      },
      response: mockedResponse,
      statusCode: 200,
      latency: 0,
      ipAddress: payload.ipAddress || null,
      advertId: payload.advertId || null,
      clickId: payload.clickid || null,
    });

    return mockedResponse;
  }

  return callWithRetry(async () => {
    const startedAt = Date.now();
    const headers = {
      "Content-Type": "application/json",
      ...(subscriptionApiKey
        ? { Authorization: `Bearer ${subscriptionApiKey}` }
        : {}),
    };
    const body = {
      action: "subscribe",
      networkname: payload.networkname,
      msisdn: payload.msisdn,
      clickid: payload.clickid,
      advertId: payload.advertId,
    };

    try {
      const response = await postJson(subscriptionUrl, {
        headers,
        body,
      });

      const responseBody = response.body;

      logAdvertiserCall({
        body,
        endpoint: subscriptionUrl,
        headers,
        payload,
        responseBody,
        startedAt,
        statusCode: response.status,
        errorCode: response.ok ? null : "advertiser_subscription_failed",
      });

      if (!response.ok) {
        const error = new Error("Advertiser subscription API request failed.");
        error.statusCode = 502;
        error.details = responseBody;
        error.upstreamStatusCode = response.status;
        throw error;
      }

      return {
        provider,
        ...responseBody,
      };
    } catch (error) {
      if (!error.details) {
        logAdvertiserCall({
          body,
          endpoint: subscriptionUrl,
          headers,
          payload,
          responseBody: { message: error.message },
          startedAt,
          statusCode: null,
          errorCode: "advertiser_subscription_network_error",
        });
      }

      throw error;
    }
  });
}

async function requestPinSubscription(payload) {
  return callConfiguredSubscription(payload);
}

module.exports = { getAntiFraudScript, requestPinSubscription };
