const Joi = require("joi");
const { AppError } = require("../../utils/appError");

const postbackSchema = Joi.object({
  ema: Joi.string()
    .trim()
    .pattern(/^966\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "ema must be a Saudi number like 966123456789.",
    }),
  clickid: Joi.string().trim().min(1).max(150).required(),
  status: Joi.string().trim().max(80).allow(""),
  eventId: Joi.string().trim().max(150).allow(""),
}).unknown(true);

function validateSubscriptionPostback(req, res, next) {
  const source = {
    ...req.query,
    ...req.body,
  };

  const { error, value } = postbackSchema.validate(source, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  req.postbackPayload = value;
  return next();
}

module.exports = { validateSubscriptionPostback };
