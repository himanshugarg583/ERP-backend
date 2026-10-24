const Joi = require('joi');

const withValidation = (schema, source = 'body') => (req, res, next) => {
  const payload = source === 'query' ? req.query : req.body;
  const { error, value } = schema.validate(payload, { abortEarly: false, allowUnknown: false, stripUnknown: true });

  if (error) {
    return res.status(422).json({
      success: false,
      statusCode: 422,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message)
    });
  }

  if (source === 'query') req.query = value;
  else req.body = value;

  return next();
};

const validateBody = (schema) => withValidation(schema, 'body');
const validateQuery = (schema) => withValidation(schema, 'query');

module.exports = {
  Joi,
  validateBody,
  validateQuery
};
