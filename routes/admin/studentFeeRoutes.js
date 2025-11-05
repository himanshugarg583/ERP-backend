const express = require('express');
const router = express.Router();

// Import StudentFee controller
const {
  assignFeeToStudent,
  getAllStudentFees,
  getSingleStudentFee,
  updateStudentFee,
  deleteStudentFee,
  bulkAssignFeeToStudents
} = require('../../controllers/admin/fees/StudentFeeController');

// Import middleware (adjust path as needed)
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

// Specific routes first (before parameterized routes)
router.post('/assignFee', authMiddleware, isAdmin, assignFeeToStudent);

router.post('/bulkAssignFee', authMiddleware, isAdmin, bulkAssignFeeToStudents);

router.get('/getAllStudentFees', authMiddleware, isAdmin, getAllStudentFees);

// Parameterized routes last
router.get('/getSingleStudentFee/:id', authMiddleware, isAdmin, getSingleStudentFee);

router.put('/updateStudentFee/:id', authMiddleware, isAdmin, updateStudentFee);

router.delete('/deleteStudentFee/:id', authMiddleware, isAdmin, deleteStudentFee);

module.exports = router;
