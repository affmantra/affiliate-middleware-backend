const Joi = require("joi");
const { AppError } = require("../../utils/appError");

const dashboardQuerySchema = Joi.object({
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  partnerLimit: Joi.number().integer().min(1).max(50).default(10),
  days: Joi.number().integer().min(1).max(90).default(30),
}).unknown(false);

function validateDashboardQuery(req, res, next) {
  const { error, value } = dashboardQuerySchema.validate(req.query, {
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
  return next();
}

module.exports = { validateDashboardQuery };
