const express = require('express');
const router = express.Router();

// Import IncomeExpense controller
const {
  createIncomeExpense,
  getAllIncomeExpense,
  getSingleIncomeExpense,
  updateIncomeExpense,
  deleteIncomeExpense,
  getFinancialSummary
} = require('../../controllers/admin/fees/IncomeExpenseController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

// Specific routes first (before parameterized routes)
router.post('/createIncomeExpense', authMiddleware, isAdmin, createIncomeExpense);

router.get('/getAllIncomeExpense', authMiddleware, isAdmin, getAllIncomeExpense);


// Parameterized routes last
router.get('/getSingleIncomeExpense/:id', authMiddleware, isAdmin, getSingleIncomeExpense);

router.put('/updateIncomeExpense/:id', authMiddleware, isAdmin, updateIncomeExpense);

router.delete('/deleteIncomeExpense/:id', authMiddleware, isAdmin, deleteIncomeExpense);

module.exports = router;