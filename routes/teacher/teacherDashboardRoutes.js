const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getTeacherDashboardStats } = require('../../controllers/teacher/dashboard/teacherDashboard');

// @route   GET /api/teacher/dashboard/stats
// @desc    Get teacher dashboard statistics
// @access  Private (Teacher only)
router.get('/stats', authMiddleware, getTeacherDashboardStats);

module.exports = router;
