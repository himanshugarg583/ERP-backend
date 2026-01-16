const express = require('express');
const router = express.Router();

// Import dashboard controller
const {
  getDashboardStats,
  getMonthlyIncomeExpense,
  getClassWiseTodayAttendance,
  getAllNotices,
  getMonthlyFeeCollection,
  getFeeAssignmentVsCollection,
  getPaymentModeCollection
} = require('../../controllers/admin/dashboard/dashboard');

// Import middleware
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

// Get complete dashboard statistics (all data in single API)
router.get('/stats', authMiddleware, isAdmin, getDashboardStats);

// Get monthly income and expense for graph
router.get('/monthly-income-expense', authMiddleware, isAdmin, getMonthlyIncomeExpense);

// Get class-wise today's attendance
router.get('/class-wise-attendance', authMiddleware, isAdmin, getClassWiseTodayAttendance);

// Get all notices
router.get('/notices', authMiddleware, isAdmin, getAllNotices);

// Get monthly fee collection for graph
router.get('/monthly-fee-collection', authMiddleware, isAdmin, getMonthlyFeeCollection);

// Get fee assignment vs collection data
router.get('/fee-assignment-collection', authMiddleware, isAdmin, getFeeAssignmentVsCollection);

// Get payment mode wise collection
router.get('/payment-mode-collection', authMiddleware, isAdmin, getPaymentModeCollection);

module.exports = router;
