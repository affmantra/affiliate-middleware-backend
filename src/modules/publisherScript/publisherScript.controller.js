const { servePublisherScript } = require("./publisherScript.service");

async function getScript(req, res) {
  const result = await servePublisherScript(req);

  return res.success({
    message: "Advertiser script fetched successfully.",
    data: result,
  });
}

module.exports = { getScript };
