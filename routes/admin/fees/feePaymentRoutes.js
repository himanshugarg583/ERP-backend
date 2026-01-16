const express = require('express');
const router = express.Router();

// Import FeePayment controller
const {
  getAllFeePayments,
  getSinglePaymentDetails,
  createFeePayment
} = require('../../../controllers/admin/fees/FeePaymentController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');

// Create new payment
router.post('/createPayment', authMiddleware, isAdmin, createFeePayment);

// Get all payments (for table view)
router.get('/getAllPayments', authMiddleware, isAdmin, getAllFeePayments);

// Get single payment details (when clicked)
router.get('/getPaymentDetails/:id', authMiddleware, isAdmin, getSinglePaymentDetails);

module.exports = router;
