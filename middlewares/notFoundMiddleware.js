/**
 * Middleware for unmatched routes (404 Not Found)
 */
const notFoundHandler = (req, res, next) => {
  const message = `API endpoint not found: ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    statusCode: 404,
    message,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message,
      details: null
    },
    details: null
  });
};

module.exports = notFoundHandler;
