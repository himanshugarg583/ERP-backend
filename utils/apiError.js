/**
 * Custom ApiError class for centralized error handling
 */
class ApiError extends Error {
  constructor(statusCode = 500, message = 'Internal Server Error', details = null, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code || ApiError.getDefaultCode(statusCode);
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static getDefaultCode(statusCode) {
    switch (statusCode) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'TOO_MANY_REQUESTS';
      case 500: return 'INTERNAL_SERVER_ERROR';
      case 503: return 'SERVICE_UNAVAILABLE';
      default: return 'ERROR';
    }
  }

  static badRequest(message = 'Bad Request', details = null, code = 'BAD_REQUEST') {
    return new ApiError(400, message, details, code);
  }

  static unauthorized(message = 'Unauthorized access', details = null, code = 'UNAUTHORIZED') {
    return new ApiError(401, message, details, code);
  }

  static forbidden(message = 'Access forbidden', details = null, code = 'FORBIDDEN') {
    return new ApiError(403, message, details, code);
  }

  static notFound(message = 'Resource not found', details = null, code = 'NOT_FOUND') {
    return new ApiError(404, message, details, code);
  }

  static conflict(message = 'Resource already exists', details = null, code = 'CONFLICT') {
    return new ApiError(409, message, details, code);
  }

  static unprocessableEntity(message = 'Validation error', details = null, code = 'UNPROCESSABLE_ENTITY') {
    return new ApiError(422, message, details, code);
  }

  static internal(message = 'Internal server error', details = null, code = 'INTERNAL_SERVER_ERROR') {
    return new ApiError(500, message, details, code);
  }
}

module.exports = ApiError;
