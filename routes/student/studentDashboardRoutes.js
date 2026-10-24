const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const {
  getStudentDashboardStats,
  getTodayClasses,
  getWeeklyTimetable,
  getPendingAssignments,
  getStudentNotices
} = require('../../controllers/student/dashboard/studentDashboard');

// Get student dashboard stats
router.get('/stats', authMiddleware, getStudentDashboardStats);

// Get today's upcoming classes
router.get('/today-classes', authMiddleware, getTodayClasses);

// Get weekly timetable (Monday-Saturday)
router.get('/weekly-timetable', authMiddleware, getWeeklyTimetable);

// Get pending assignments
router.get('/pending-assignments', authMiddleware, getPendingAssignments);

// Get student notices
router.get('/notices', authMiddleware, getStudentNotices);

module.exports = router;
