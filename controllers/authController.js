const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/admin/users');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const STAFF_ROLES = new Set([
  'staff',
  'accountant',
  'hr',
  'librarian',
  'admission_officer',
  'transport_manager',
  'hostel_warden'
]);

/**
 * Register a new user
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!email || !password || !name) {
    throw ApiError.badRequest('Name, email, and password are required fields.');
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw ApiError.conflict('User with this email already exists.');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role: role || 'student'
  });

  // Omit password from response
  const userResponse = newUser.toJSON ? newUser.toJSON() : { ...newUser };
  delete userResponse.password;

  res.status(201).json({
    success: true,
    statusCode: 201,
    message: 'User created successfully!',
    user: userResponse
  });
});

/**
 * User login
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Please provide both email and password.');
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw ApiError.notFound('User not found with this email.');
  }

  const isPasswordValid =
    (await bcrypt.compare(password, user.password).catch(() => false)) ||
    (password === user.password);

  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid password. Please check your credentials.');
  }

  if (!process.env.JWT_SECRET) {
    throw ApiError.internal('JWT secret key is not configured on the server.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  let loginMessage = 'Login successful';

  if (user.role === 'admin') {
    loginMessage = 'Welcome back principal login';
  } else if (user.role === 'teacher') {
    loginMessage = 'Teacher login';
  } else if (user.role === 'student') {
    loginMessage = 'Student login';
  } else if (user.role === 'accountant') {
    loginMessage = 'Accountant login';
  } else if (STAFF_ROLES.has(user.role)) {
    loginMessage = 'Staff login';
  }

  res.status(200).json({
    success: true,
    statusCode: 200,
    message: loginMessage,
    token,
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

/**
 * User logout
 */
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Logged out successfully'
  });
};
