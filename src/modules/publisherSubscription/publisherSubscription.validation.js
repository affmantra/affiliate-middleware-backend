const Joi = require("joi");
const { AppError } = require("../../utils/appError");

const subscribeBodySchema = Joi.object({
  productId: Joi.alternatives()
    .try(Joi.string().trim().min(1).max(40), Joi.number().integer().positive())
    .required(),
  msisdn: Joi.string()
    .trim()
    .pattern(/^966\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "msisdn must be a Saudi number like 966123456789.",
    }),
  clickId: Joi.string().trim().min(1).max(150).required(),
  advertId: Joi.string().trim().min(1).max(150).required(),
  networkname: Joi.string().trim().max(80).allow(""),
}).unknown(false);

function validateSubscribeRequest(req, res, next) {
  const { error, value } = subscribeBodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  req.body = value;
  req.body.productId = String(value.productId).trim();
  return next();
}

module.exports = { validateSubscribeRequest };
