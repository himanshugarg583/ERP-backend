const express = require('express');
const router = express.Router();
const { authMiddleware ,isStudent} = require('../../middlewares/authMiddleware');
const { 
  getStudentFeeDetails, 
  getStudentInstallments,
  getStudentPaymentHistory,
  createInstallmentPaymentOrder,
  verifyInstallmentPayment
} = require('../../controllers/student/fees/studentFeesController');

// Get student fee details (user_id from token)
router.get('/getFeeDetails', authMiddleware,isStudent, getStudentFeeDetails);

// Get student installments (user_id from token)
router.get('/getInstallments', authMiddleware,isStudent, getStudentInstallments);

// Get student payment history (user_id from token)
router.get('/getPaymentHistory', authMiddleware, isStudent, getStudentPaymentHistory);

// Create Razorpay order for installment payment
router.post('/createPaymentOrder', authMiddleware, isStudent, createInstallmentPaymentOrder);

// Verify Razorpay payment and update records
router.post('/verifyPayment', authMiddleware, isStudent, verifyInstallmentPayment);

module.exports = router;
