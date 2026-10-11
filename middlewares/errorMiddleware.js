const ApiError = require('../utils/apiError');

/**
 * Centralized error handling middleware for Express
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let details = err.details || null;

  // 1. Sequelize Unique Constraint Error (e.g. duplicate email, admission_no, etc.)
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    const fields = err.errors ? err.errors.map(e => e.path).filter(Boolean) : [];
    const fieldList = fields.length ? fields.join(', ') : 'field';
    message = `A record with this ${fieldList} already exists.`;
    details = err.errors
      ? err.errors.map(e => ({
          field: e.path,
          message: e.message || `${e.path} must be unique`,
          value: e.value
        }))
      : null;
  }

  // 2. Sequelize Validation Error
  else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    const messages = err.errors ? err.errors.map(e => e.message) : [];
    message = messages.length ? messages.join('. ') : 'Database validation failed.';
    details = err.errors
      ? err.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      : null;
  }

  // 3. Sequelize Foreign Key Constraint Error
  else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    code = 'FOREIGN_KEY_VIOLATION';
    const tableName = err.table || 'referenced';
    message = `Cannot perform operation: related record in ${tableName} does not exist or is currently in use.`;
    details = {
      table: err.table,
      field: err.fields
    };
  }

  // 4. Sequelize Connection / Timeout Errors
  else if (
    err.name === 'SequelizeConnectionError' ||
    err.name === 'SequelizeConnectionRefusedError' ||
    err.name === 'SequelizeTimeoutError'
  ) {
    statusCode = 503;
    code = 'DATABASE_CONNECTION_ERROR';
    message = 'Database service is temporarily unavailable. Please try again later.';
  }

  // 5. Sequelize Generic Database Error (e.g. SQL syntax, column mismatch)
  else if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    code = 'DATABASE_ERROR';
    message = process.env.NODE_ENV === 'production'
      ? 'A database error occurred.'
      : (err.parent?.message || err.message || 'Database query error');
  }

  // 6. JSON Web Token Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Authentication failed: Invalid or malformed token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication failed: Token has expired. Please log in again.';
  }

  // 7. Joi Validation Errors (if thrown directly)
  else if (err.isJoi || (err.name === 'ValidationError' && Array.isArray(err.details))) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.details[0]?.message || 'Input validation failed.';
    details = err.details.map(d => ({
      field: d.path?.join('.'),
      message: d.message
    }));
  }

  // 8. Multer File Upload Errors
  else if (err.name === 'MulterError') {
    statusCode = 400;
    code = `UPLOAD_${err.code || 'ERROR'}`;
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'Uploaded file is too large.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = `Unexpected file field: ${err.field || 'unknown'}.`;
        break;
      default:
        message = err.message || 'File upload failed.';
    }
  }

  // 9. Malformed JSON Body parsing error from Express
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON_BODY';
    message = 'Invalid JSON payload received in request body.';
  }

  // Log non-operational or 500 errors to console for server debugging
  if (statusCode >= 500) {
    console.error(`[SERVER ERROR] ${req.method} ${req.originalUrl}:`, err);
  } else if (process.env.NODE_ENV === 'development') {
    console.warn(`[API ERROR ${statusCode}] ${req.method} ${req.originalUrl}: ${message}`);
  }

  // Send standardized JSON error response
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: {
      code,
      message,
      details
    },
    details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
