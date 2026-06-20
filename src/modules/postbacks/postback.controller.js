const { processSubscriptionPostback } = require("./postback.service");

async function receiveSubscriptionPostback(req, res) {
  const result = await processSubscriptionPostback(req);

  return res.success({
    message: result.duplicate
      ? "Postback already processed."
      : "Subscription postback processed successfully.",
    data: result,
  });
}

module.exports = { receiveSubscriptionPostback };
