const ok = (res, data = null, meta = null, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    error: null,
    meta
  });
};

const fail = (res, { statusCode = 400, code = 'bad_request', message = 'Bad request', details = null } = {}) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    data: null,
    error: {
      code,
      message,
      details
    },
    details,
    meta: null
  });
};

// Helper aliases for controllers using (res, message, statusCode) signatures
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data
  });
};

const errorResponse = (res, message = 'An error occurred', statusCode = 400, details = null) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: {
      code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST',
      message,
      details
    },
    details
  });
};

module.exports = {
  ok,
  fail,
  successResponse,
  errorResponse
};