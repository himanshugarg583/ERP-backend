const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const {
  getStudentDashboard,
  getTodayClasses,
  getPendingAssignments,
  getAcademicPerformance,
  getStudentNotices
} = require('../../controllers/student/dashboard/studentDashboard');

// Get student dashboard data (attendance, assignments, exam performance)
router.get('/stats', authMiddleware, getStudentDashboard);

// Get today's upcoming classes
router.get('/today-classes', authMiddleware, getTodayClasses);

// Get pending assignments
router.get('/pending-assignments', authMiddleware, getPendingAssignments);

// Get academic performance (exam-wise subject scores)
router.get('/academic-performance', authMiddleware, getAcademicPerformance);

// Get student notices
router.get('/notices', authMiddleware, getStudentNotices);

module.exports = router;
