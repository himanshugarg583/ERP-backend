const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const {
  getDashboardStats,
  getMonthlyCollectionChart,
  getPaymentMethodBreakdown,
  getRecentPayments,
  getClassWiseCollection
} = require('../../controllers/Accountant/accountantDashboardController');

// ============= DASHBOARD STATS =============
// @route   GET /api/accountant/dashboard/stats
// @desc    Get overall dashboard statistics
// @access  Private (Accountant only)
router.get('/stats', authMiddleware, getDashboardStats);

// ============= CHARTS & GRAPHS =============
// @route   GET /api/accountant/dashboard/monthly-collection
// @desc    Get monthly fee collection chart data
// @access  Private (Accountant only)
router.get('/monthly-collection', authMiddleware, getMonthlyCollectionChart);

// @route   GET /api/accountant/dashboard/payment-methods
// @desc    Get payment method breakdown
// @access  Private (Accountant only)
router.get('/payment-methods', authMiddleware, getPaymentMethodBreakdown);

// @route   GET /api/accountant/dashboard/class-wise-collection
// @desc    Get class-wise fee collection
// @access  Private (Accountant only)
router.get('/class-wise-collection', authMiddleware, getClassWiseCollection);

// ============= RECENT ACTIVITY =============
// @route   GET /api/accountant/dashboard/recent-payments
// @desc    Get recent payments list
// @access  Private (Accountant only)
router.get('/recent-payments', authMiddleware, getRecentPayments);

module.exports = router;
