const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { 
  addIncome, 
  addExpense, 
  getIncomeExpenseGraph, 
  getMonthlyExpense,
  getIncomeList,
  getExpenseList,
  updateIncomeExpense,
  deleteIncomeExpense
} = require('../../controllers/Accountant/incomeExpenseController');

const {
  createOrder,
  verifyPayment,
  getPaymentDetails
} = require('../../controllers/Accountant/razorpayController');

// Import profile routes
const accountantProfileRoutes = require('./accountantProfileRoutes');
const accountantDashboardRoutes = require('./accountantDashboard');

// ========== Profile Routes ==========
router.use('/profile', accountantProfileRoutes);

// ========== Dashboard Routes ==========
router.use('/dashboard', accountantDashboardRoutes);

// @route   POST /api/accountant/income
// @desc    Add income entry
// @access  Private (Accountant only)
router.post('/income', authMiddleware, addIncome);

// @route   POST /api/accountant/expense
// @desc    Add expense entry
// @access  Private (Accountant only)
router.post('/expense', authMiddleware, addExpense);

// @route   GET /api/accountant/income-list
// @desc    Get all income entries
// @access  Private (Accountant only)
router.get('/income-list', authMiddleware, getIncomeList);

// @route   GET /api/accountant/expense-list
// @desc    Get all expense entries
// @access  Private (Accountant only)
router.get('/expense-list', authMiddleware, getExpenseList);

// @route   PUT /api/accountant/income-expense/:id
// @desc    Update income/expense entry
// @access  Private (Accountant only)
router.put('/income-expense/:id', authMiddleware, updateIncomeExpense);

// @route   DELETE /api/accountant/income-expense/:id
// @desc    Delete income/expense entry
// @access  Private (Accountant only)
router.delete('/income-expense/:id', authMiddleware, deleteIncomeExpense);

// @route   GET /api/accountant/income-expense-graph
// @desc    Get income vs expense graph data
// @access  Private (Accountant only)
router.get('/income-expense-graph', authMiddleware, getIncomeExpenseGraph);

// @route   GET /api/accountant/monthly-expense
// @desc    Get monthly expense data
// @access  Private (Accountant only)
router.get('/monthly-expense', authMiddleware, getMonthlyExpense);

// ========== Razorpay Payment Routes ==========

// @route   POST /api/accountant/payment/create-order
// @desc    Create Razorpay order for payment
// @access  Public
router.post('/payment/create-order', createOrder);

// @route   POST /api/accountant/payment/verify-payment
// @desc    Verify Razorpay payment signature
// @access  Public
router.post('/payment/verify-payment', verifyPayment);

// @route   GET /api/accountant/payment/details/:payment_id
// @desc    Get Razorpay payment details
// @access  Public
router.get('/payment/details/:payment_id', getPaymentDetails);

module.exports = router;
