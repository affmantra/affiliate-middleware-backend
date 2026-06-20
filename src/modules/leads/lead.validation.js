const Joi = require("joi");
const { AppError } = require("../../utils/appError");

const objectIdPattern = /^[a-f\d]{24}$/i;
const leadStatuses = ["received", "processing", "redirected", "subscribed", "failed", "rejected"];

const listLeadsSchema = Joi.object({
  partnerId: Joi.string().pattern(objectIdPattern).allow(""),
  status: Joi.string().valid(...leadStatuses).allow(""),
  productId: Joi.alternatives()
    .try(Joi.string().trim().min(1).max(40), Joi.number().integer().positive())
    .allow(""),
  advertId: Joi.string().trim().max(150).allow(""),
  clickId: Joi.string().trim().max(150).allow(""),
  search: Joi.string().trim().max(120).allow(""),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(false);

function validateListLeads(req, res, next) {
  const { error, value } = listLeadsSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  if (value.dateFrom && value.dateTo && new Date(value.dateFrom) > new Date(value.dateTo)) {
    return next(new AppError("dateFrom cannot be after dateTo.", 400));
  }

  req.query = value;
  if (req.query.productId) req.query.productId = String(req.query.productId).trim();
  return next();
}

function validateLeadId(req, res, next) {
  if (!objectIdPattern.test(req.params.id || "")) {
    return next(new AppError("Lead id is invalid.", 400));
  }

  return next();
}

module.exports = { validateLeadId, validateListLeads };
