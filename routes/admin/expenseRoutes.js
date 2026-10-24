const express = require('express');
const router = express.Router();

// Import Expense controller
const {
  createExpense,
  getAllExpense,
  getSingleExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
} = require('../../controllers/admin/fees/ExpenseController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

// Create expense
router.post('/createExpense', authMiddleware, isAdmin, createExpense);

// Get all expense
router.get('/getAllExpense', authMiddleware, isAdmin, getAllExpense);

// Expense summary for cards
router.get('/expense-summary', authMiddleware, isAdmin, getExpenseSummary);

// Get single expense
router.get('/getSingleExpense/:id', authMiddleware, isAdmin, getSingleExpense);

// Update expense
router.put('/updateExpense/:id', authMiddleware, isAdmin, updateExpense);

// Delete expense
router.delete('/deleteExpense/:id', authMiddleware, isAdmin, deleteExpense);

module.exports = router;
