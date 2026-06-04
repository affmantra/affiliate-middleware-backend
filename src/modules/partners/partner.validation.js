const Joi = require("joi");
const { AppError } = require("../../utils/appError");

const objectIdPattern = /^[a-f\d]{24}$/i;

const partnerFields = {
  name: Joi.string().trim().min(2).max(150),
  companyName: Joi.string().trim().max(180).allow("", null),
  email: Joi.string().trim().lowercase().email().max(254),
  phone: Joi.string().trim().max(30).allow("", null),
  website: Joi.string().trim().uri({ scheme: ["http", "https"] }).max(2048).allow("", null),
  status: Joi.string().valid("active", "inactive", "blocked"),
  notes: Joi.string().trim().max(2000).allow("", null),
};

const createPartnerSchema = Joi.object({
  name: partnerFields.name.required(),
  companyName: partnerFields.companyName,
  email: partnerFields.email.required(),
  phone: partnerFields.phone,
  website: partnerFields.website,
  status: partnerFields.status.default("active"),
  notes: partnerFields.notes,
}).unknown(false);

const updatePartnerSchema = Joi.object({
  name: partnerFields.name,
  companyName: partnerFields.companyName,
  email: partnerFields.email,
  phone: partnerFields.phone,
  website: partnerFields.website,
  notes: partnerFields.notes,
}).min(1).unknown(false);

const updatePartnerStatusSchema = Joi.object({
  status: partnerFields.status.required(),
}).unknown(false);

const listPartnersSchema = Joi.object({
  search: Joi.string().trim().max(100).allow(""),
  status: partnerFields.status,
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).unknown(false);

function validate(schema, source = "body") {
  return function validateRequest(req, res, next) {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    req[source] = value;
    return next();
  };
}

function validatePartnerId(req, res, next) {
  if (!objectIdPattern.test(req.params.id || "")) {
    return next(new AppError("Partner id is invalid.", 400));
  }

  return next();
}

module.exports = {
  validateCreatePartner: validate(createPartnerSchema),
  validateListPartners: validate(listPartnersSchema, "query"),
  validatePartnerId,
  validateUpdatePartner: validate(updatePartnerSchema),
  validateUpdatePartnerStatus: validate(updatePartnerStatusSchema),
};
