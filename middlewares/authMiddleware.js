const jwt = require('jsonwebtoken');
const { User } = require('../models/admin/users');
const ApiError = require('../utils/apiError');

const STAFF_ROLES = new Set([
  'staff',
  'accountant',
  'hr',
  'librarian',
  'admission_officer',
  'transport_manager',
  'hostel_warden'
]);

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if token is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authorization token missing or invalid'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      where: { id: decoded.id }
    });

    if (!user) {
      return next(ApiError.unauthorized('User not found or deleted'));
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email
    };
    next();
  } catch (err) {
    next(err);
  }
};

const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(ApiError.forbidden('Only admin is authorized'));
  }
  next();
};

const isTeacher = (req, res, next) => {
  if (req.user?.role !== 'teacher') {
    return next(ApiError.forbidden('Only teacher is authorized'));
  }
  next();
};

const isAccountant = (req, res, next) => {
  if (req.user?.role !== 'accountant') {
    return next(ApiError.forbidden('Only accountant is authorized'));
  }
  next();
};

const isStudent = (req, res, next) => {
  if (req.user?.role !== 'student') {
    return next(ApiError.forbidden('Only student is authorized'));
  }
  next();
};

const isStaff = (req, res, next) => {
  if (!STAFF_ROLES.has(req.user?.role)) {
    return next(ApiError.forbidden('Only staff is authorized'));
  }
  next();
};

module.exports = {
  authMiddleware,
  isAdmin,
  isTeacher,
  isStudent,
  isAccountant,
  isStaff
};
