const ApiError = require('../utils/apiError');

const validationMiddleware = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));
      const message = error.details[0]?.message?.replace(/['"]/g, '') || 'Validation failed';
      return next(new ApiError(400, message, details, 'VALIDATION_ERROR'));
    }
    next();
  };
};

module.exports = validationMiddleware;