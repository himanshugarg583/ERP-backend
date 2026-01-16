const express = require('express');
const router = express.Router();

// Import StudentFeeInstallment controller
const {
  createInstallmentsForStudentFee,
  getInstallmentsByStudentFeeId,
  getSingleInstallment,
  markInstallmentAsPaid,
  updateInstallment,
  deleteInstallment,
  getOverdueInstallments
} = require('../../../controllers/admin/fees/StudentFeeInstallmentController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');

// Specific routes first (before parameterized routes)
router.post('/createInstallments', authMiddleware, isAdmin, createInstallmentsForStudentFee);

router.get('/overdue', authMiddleware, isAdmin, getOverdueInstallments);

router.get('/studentFee/:student_fee_id', authMiddleware, isAdmin, getInstallmentsByStudentFeeId);

router.post('/markPaid/:id', authMiddleware, isAdmin, markInstallmentAsPaid);

// Parameterized routes last
router.get('/getSingleInstallment/:id', authMiddleware, isAdmin, getSingleInstallment);

router.put('/updateInstallment/:id', authMiddleware, isAdmin, updateInstallment);

router.delete('/deleteInstallment/:id', authMiddleware, isAdmin, deleteInstallment);

module.exports = router;