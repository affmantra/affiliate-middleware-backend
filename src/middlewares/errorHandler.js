function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: isServerError ? "Internal server error." : error.message,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
