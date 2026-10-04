const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { 
  getProfile, 
  changePassword 
} = require('../../controllers/Accountant/accountantProfileController');

// @route   GET /api/accountant/profile/me
// @desc    Get accountant profile details
// @access  Private (Accountant only)
router.get('/me', authMiddleware, getProfile);

// @route   PUT /api/accountant/profile/change-password
// @desc    Change accountant password
// @access  Private (Accountant only)
router.put('/change-password', authMiddleware, changePassword);

module.exports = router;
