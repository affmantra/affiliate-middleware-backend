const partnerService = require("./partner.service");

function sendSuccess(res, statusCode, message, data) {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

async function createPartner(req, res) {
  const result = await partnerService.createPartner(req.body, req.admin._id);

  sendSuccess(res, 201, "Partner created successfully.", result);
}

async function getPartnerDetails(req, res) {
  const partner = await partnerService.getPartnerDetails(req.params.id);

  sendSuccess(res, 200, "Partner fetched successfully.", { partner });
}

async function listPartners(req, res) {
  const result = await partnerService.listPartners(req.query);

  sendSuccess(res, 200, "Partners fetched successfully.", result);
}

async function regenerateApiKey(req, res) {
  const result = await partnerService.regenerateApiKey(req.params.id, req.admin._id);

  sendSuccess(res, 200, "Partner API key regenerated successfully.", result);
}

async function updatePartner(req, res) {
  const partner = await partnerService.updatePartner(
    req.params.id,
    req.body,
    req.admin._id,
  );

  sendSuccess(res, 200, "Partner updated successfully.", { partner });
}

async function updatePartnerStatus(req, res) {
  const partner = await partnerService.updatePartnerStatus(
    req.params.id,
    req.body.status,
    req.admin._id,
  );

  sendSuccess(res, 200, "Partner status updated successfully.", { partner });
}

module.exports = {
  createPartner,
  getPartnerDetails,
  listPartners,
  regenerateApiKey,
  updatePartner,
  updatePartnerStatus,
};
