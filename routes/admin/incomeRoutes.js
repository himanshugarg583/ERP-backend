const express = require('express');
const router = express.Router();

// Import Income controller
const {
  createIncome,
  getAllIncome,
  getSingleIncome,
  updateIncome,
  deleteIncome
} = require('../../controllers/admin/fees/IncomeController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

// Create income
router.post('/createIncome', authMiddleware, isAdmin, createIncome);

// Get all income
router.get('/getAllIncome', authMiddleware, isAdmin, getAllIncome);

// Get single income
router.get('/getSingleIncome/:id', authMiddleware, isAdmin, getSingleIncome);

// Update income
router.put('/updateIncome/:id', authMiddleware, isAdmin, updateIncome);

// Delete income
router.delete('/deleteIncome/:id', authMiddleware, isAdmin, deleteIncome);

module.exports = router;
