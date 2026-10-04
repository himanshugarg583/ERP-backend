const express = require('express');
const router = express.Router();
const { authMiddleware, isAccountant } = require('../../middlewares/authMiddleware');
const {
  addFeeHead,
  getFeeHeads,
  getFeeHeadById,
  updateFeeHead,
  deleteFeeHead
} = require('../../controllers/Accountant/feeHeadController');
const {
  addFeeStructure,
  getFeeStructures,
  getFeeStructureById,
  updateFeeStructure,
  deleteFeeStructure
} = require('../../controllers/Accountant/feeStructureController');
const {
  fillFeePayment,
  getStudentInstallments
} = require('../../controllers/Accountant/feeAssignmentController');

// ============= FEE HEAD ROUTES =============
// @route   POST /api/accountant/fees/fee-head
// @desc    Add fee head
// @access  Private (Accountant only)
router.post('/fee-head', authMiddleware, addFeeHead);

// @route   GET /api/accountant/fees/fee-head
// @desc    Get all fee heads
// @access  Private (Accountant only)
router.get('/fee-head', authMiddleware, getFeeHeads);

// @route   GET /api/accountant/fees/fee-head/:id
// @desc    Get single fee head
// @access  Private (Accountant only)
router.get('/fee-head/:id', authMiddleware, getFeeHeadById);

// @route   PUT /api/accountant/fees/fee-head/:id
// @desc    Update fee head
// @access  Private (Accountant only)
router.put('/fee-head/:id', authMiddleware, updateFeeHead);

// @route   DELETE /api/accountant/fees/fee-head/:id
// @desc    Delete fee head
// @access  Private (Accountant only)
router.delete('/fee-head/:id', authMiddleware, deleteFeeHead);

// ============= FEE STRUCTURE ROUTES =============
// @route   POST /api/accountant/fees/fee-structure
// @desc    Add fee structure
// @access  Private (Accountant only)
router.post('/fee-structure', authMiddleware, addFeeStructure);

// @route   GET /api/accountant/fees/fee-structure
// @desc    Get all fee structures
// @access  Private (Accountant only)
router.get('/fee-structure', authMiddleware, getFeeStructures);

// @route   GET /api/accountant/fees/fee-structure/:id
// @desc    Get single fee structure
// @access  Private (Accountant only)
router.get('/fee-structure/:id', authMiddleware, getFeeStructureById);

// @route   PUT /api/accountant/fees/fee-structure/:id
// @desc    Update fee structure
// @access  Private (Accountant only)
router.put('/fee-structure/:id', authMiddleware, updateFeeStructure);

// @route   DELETE /api/accountant/fees/fee-structure/:id
// @desc    Delete fee structure
// @access  Private (Accountant only)
router.delete('/fee-structure/:id', authMiddleware, deleteFeeStructure);

// ============= FEE PAYMENT ROUTES =============
// @route   POST /api/accountant/fees/fill-payment
// @desc    Fill student fee payment and create entries
// @access  Private (Accountant only)
router.post('/fill-payment', authMiddleware, fillFeePayment);

// @route   GET /api/accountant/fees/student-installments/:student_id
// @desc    Get all installments for a student
// @access  Private (Accountant only)
router.get('/student-installments/:student_id', authMiddleware, getStudentInstallments);

module.exports = router;
