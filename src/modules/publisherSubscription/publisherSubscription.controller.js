const { subscribePublisher } = require("./publisherSubscription.service");

async function subscribe(req, res) {
  const result = await subscribePublisher(req);

  return res.success({
    message: "Subscription request created successfully.",
    data: result,
  });
}

module.exports = { subscribe };
