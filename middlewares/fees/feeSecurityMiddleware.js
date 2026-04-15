const Joi = require('joi');
const { Student } = require('../../models/admin/Student');

const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: false, stripUnknown: true });
    if (error) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: error.details.map((d) => d.message)
        }
      });
    }

    req.body = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, allowUnknown: false, stripUnknown: true });
    if (error) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'validation_error',
          message: 'Query validation failed',
          details: error.details.map((d) => d.message)
        }
      });
    }

    req.query = value;
    next();
  };
};

const inMemoryRateLimiter = ({ key = 'global', max = 60, windowMs = 60 * 1000 }) => {
  const hitMap = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const actor = `${key}:${req.user?.id || req.ip}`;
    const entry = hitMap.get(actor) || { count: 0, start: now };

    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }

    entry.count += 1;
    hitMap.set(actor, entry);

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'rate_limited',
          message: 'Too many requests, please retry later.'
        }
      });
    }

    next();
  };
};

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'forbidden',
          message: 'You are not authorized for this action.'
        }
      });
    }

    next();
  };
};

const enforceStudentSelfByParam = (paramName = 'studentId') => {
  return async (req, res, next) => {
    try {
      if (req.user?.role !== 'student') return next();

      const requestedStudentId = Number(req.params[paramName]);
      if (!Number.isFinite(requestedStudentId) || requestedStudentId <= 0) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'invalid_student_param',
            message: `Invalid ${paramName}`
          }
        });
      }

      const student = await Student.findOne({
        where: { user_id: req.user.id },
        attributes: ['id']
      });

      if (!student || Number(student.id) !== requestedStudentId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'forbidden',
            message: 'You can only access your own fee records.'
          }
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'internal_error',
          message: error.message
        }
      });
    }
  };
};

module.exports = {
  Joi,
  validateBody,
  validateQuery,
  inMemoryRateLimiter,
  requireRoles,
  enforceStudentSelfByParam
};
