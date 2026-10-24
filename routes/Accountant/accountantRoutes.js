const express = require('express');
const router = express.Router();

// Import profile routes
const accountantProfileRoutes = require('./accountantProfileRoutes');
const accountantDashboardRoutes = require('./accountantDashboard');

// ========== Profile Routes ==========
router.use('/profile', accountantProfileRoutes);

// ========== Dashboard Routes ==========
router.use('/dashboard', accountantDashboardRoutes);

module.exports = router;
