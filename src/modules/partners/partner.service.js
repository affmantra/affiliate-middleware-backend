const crypto = require("crypto");
const { AppError } = require("../../utils/appError");
const partnerRepository = require("./partner.repository");

function generateRawApiKey() {
  return `pk_live_${crypto.randomBytes(32).toString("hex")}`;
}

function hashApiKey(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function previewApiKey(apiKey) {
  return `${apiKey.slice(0, 8)}xxxxx${apiKey.slice(-4)}`;
}

function normalizeNullableFields(payload) {
  const normalizedPayload = { ...payload };

  for (const field of ["companyName", "phone", "website", "notes"]) {
    if (normalizedPayload[field] === "") {
      normalizedPayload[field] = null;
    }
  }

  return normalizedPayload;
}

function serializePartner(partner) {
  const source = typeof partner.toObject === "function" ? partner.toObject() : partner;

  return {
    id: source._id,
    name: source.name,
    companyName: source.companyName,
    email: source.email,
    phone: source.phone,
    website: source.website,
    apiKeyPreview: source.apiKeyPreview,
    status: source.status,
    notes: source.notes,
    createdBy: source.createdBy,
    updatedBy: source.updatedBy,
    deletedAt: source.deletedAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function createPartner(payload, adminId) {
  const normalizedPayload = normalizeNullableFields(payload);
  const existingPartner = await partnerRepository.findPartnerByEmail(
    normalizedPayload.email,
  );

  if (existingPartner) {
    throw new AppError("A partner with this email already exists.", 409);
  }

  const apiKey = generateRawApiKey();
  const partner = await partnerRepository.createPartner({
    ...normalizedPayload,
    apiKeyHash: hashApiKey(apiKey),
    apiKeyPreview: previewApiKey(apiKey),
    createdBy: adminId,
    updatedBy: adminId,
  });

  return {
    partner: serializePartner(partner),
    apiKey,
  };
}

async function getPartnerDetails(partnerId) {
  const partner = await partnerRepository.findPartnerById(partnerId);

  if (!partner) {
    throw new AppError("Partner not found.", 404);
  }

  return serializePartner(partner);
}

async function getPartnerByApiKey(apiKey) {
  const partner = await partnerRepository.findPartnerByApiKeyHash(hashApiKey(apiKey));

  if (!partner) {
    throw new AppError("API key is invalid.", 401);
  }

  return serializePartner(partner);
}

async function listPartners(options) {
  const result = await partnerRepository.listPartners(options);

  return {
    partners: result.items.map(serializePartner),
    pagination: result.pagination,
  };
}

async function updatePartner(partnerId, payload, adminId) {
  const normalizedPayload = normalizeNullableFields(payload);

  if (normalizedPayload.email) {
    const existingPartner = await partnerRepository.findPartnerByEmailExcludingId(
      normalizedPayload.email,
      partnerId,
    );

    if (existingPartner) {
      throw new AppError("A partner with this email already exists.", 409);
    }
  }

  const partner = await partnerRepository.updatePartnerById(partnerId, {
    ...normalizedPayload,
    updatedBy: adminId,
  });

  if (!partner) {
    throw new AppError("Partner not found.", 404);
  }

  return serializePartner(partner);
}

async function updatePartnerStatus(partnerId, status, adminId) {
  const partner = await partnerRepository.updatePartnerById(partnerId, {
    status,
    updatedBy: adminId,
  });

  if (!partner) {
    throw new AppError("Partner not found.", 404);
  }

  return serializePartner(partner);
}

async function regenerateApiKey(partnerId, adminId) {
  const apiKey = generateRawApiKey();
  const partner = await partnerRepository.updatePartnerById(partnerId, {
    apiKeyHash: hashApiKey(apiKey),
    apiKeyPreview: previewApiKey(apiKey),
    updatedBy: adminId,
  });

  if (!partner) {
    throw new AppError("Partner not found.", 404);
  }

  return {
    partner: serializePartner(partner),
    apiKey,
  };
}

module.exports = {
  createPartner,
  getPartnerByApiKey,
  getPartnerDetails,
  hashApiKey,
  listPartners,
  regenerateApiKey,
  updatePartner,
  updatePartnerStatus,
};
