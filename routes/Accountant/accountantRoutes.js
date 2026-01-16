const express = require('express');
const router = express.Router();
const { authMiddleware, isAccountant } = require('../../middlewares/authMiddleware');
const { 
  addIncome, 
  addExpense, 
  getIncomeExpenseGraph, 
  getMonthlyExpense,
  getIncomeList,
  getExpenseList,
  updateIncomeExpense,
  deleteIncomeExpense
} = require('../../controllers/accountant/incomeExpenseController');

const {
  assignFeeToClass,
  getClassesForFeeAssignment,
  getAssignedFeesByClass,
  getStudentFeeDetails,
  getAllFeePayments,
  getFeePaymentByReceipt
} = require('../../controllers/accountant/feeAssignmentController');

const {
  createOrder,
  verifyPayment,
  getPaymentDetails
} = require('../../controllers/accountant/razorpayController');

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

// @route   POST /api/accountant/assign-fee
// @desc    Assign fee structure to all students in a class with installments
// @access  Private (Accountant only)
router.post('/assign-fee', authMiddleware, assignFeeToClass);

// @route   GET /api/accountant/classes-for-fee-assignment
// @desc    Get all classes with student count for fee assignment
// @access  Private (Accountant only)
router.get('/classes-for-fee-assignment', authMiddleware, getClassesForFeeAssignment);

// @route   GET /api/accountant/assigned-fees/:class_section_id
// @desc    Get assigned fees for a specific class
// @access  Private (Accountant only)
router.get('/assigned-fees/:class_section_id', authMiddleware, getAssignedFeesByClass);

// @route   GET /api/accountant/student-fee-details/:student_id
// @desc    Get complete fee details for a specific student
// @access  Private (Accountant only)
router.get('/student-fee-details/:student_id', authMiddleware, getStudentFeeDetails);

// @route   GET /api/accountant/fee-payments
// @desc    Get all fee payments with filters
// @access  Private (Accountant only)
router.get('/fee-payments', authMiddleware, getAllFeePayments);

// @route   GET /api/accountant/fee-payment/:receipt_number
// @desc    Get payment details by receipt number
// @access  Private (Accountant only)
router.get('/fee-payment/:receipt_number', authMiddleware, getFeePaymentByReceipt);

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
