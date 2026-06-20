const Joi = require("joi");
const { AppError } = require("../../utils/appError");

const scriptBodySchema = Joi.object({
  productId: Joi.alternatives()
    .try(Joi.string().trim().min(1).max(40), Joi.number().integer().positive())
    .required(),
  clickId: Joi.string().trim().min(1).max(150).required(),
  buttonId: Joi.string()
    .trim()
    .pattern(/^#[A-Za-z][A-Za-z0-9_-]*$/)
    .max(120)
    .required()
    .messages({
      "string.pattern.base": "buttonId must be a CSS id selector like #subb.",
    }),
  subId: Joi.string().trim().max(150).allow(""),
  source: Joi.string().trim().max(150).allow(""),
}).unknown(true);

function validateScriptRequest(req, res, next) {
  const { error, value } = scriptBodySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: false,
  });

  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }

  req.body = value;
  req.body.productId = String(value.productId).trim();
  return next();
}

module.exports = { validateScriptRequest };
