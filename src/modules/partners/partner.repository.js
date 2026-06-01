const Partner = require("./partner.model");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildListFilter({ search, status }) {
  const filter = { deletedAt: null };

  if (status) {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: regex }, { companyName: regex }, { email: regex }];
  }

  return filter;
}

async function createPartner(payload) {
  return Partner.create(payload);
}

async function findPartnerByEmail(email) {
  return Partner.findOne({ email, deletedAt: null });
}

async function findPartnerByEmailExcludingId(email, excludedId) {
  return Partner.findOne({
    _id: { $ne: excludedId },
    email,
    deletedAt: null,
  });
}

async function findPartnerById(id) {
  return Partner.findOne({ _id: id, deletedAt: null });
}

async function listPartners(options) {
  const page = options.page;
  const limit = options.limit;
  const skip = (page - 1) * limit;
  const filter = buildListFilter(options);

  const [items, total] = await Promise.all([
    Partner.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-apiKeyHash")
      .lean(),
    Partner.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      limit,
      page,
      pages: Math.ceil(total / limit) || 1,
      total,
    },
  };
}

async function updatePartnerById(id, payload) {
  return Partner.findOneAndUpdate(
    { _id: id, deletedAt: null },
    payload,
    { new: true, runValidators: true },
  );
}

module.exports = {
  createPartner,
  findPartnerByEmail,
  findPartnerByEmailExcludingId,
  findPartnerById,
  listPartners,
  updatePartnerById,
};
