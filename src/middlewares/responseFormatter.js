function responseFormatter(req, res, next) {
  res.success = function sendSuccess({ data = {}, message = "Success.", statusCode = 200 } = {}) {
    return res.status(statusCode).json({
      success: true,
      message,
      requestId: req.id,
      data,
    });
  };

  return next();
}

module.exports = { responseFormatter };
