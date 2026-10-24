const express = require('express');
const router = express.Router();
const { authMiddleware, isTeacher } = require('../../middlewares/authMiddleware');
const { 
  getTeacherClasses, 
  getClassStudentList, 
  getStudentsByClass, 
  markClassAttendance, 
  getClassAttendanceByDate, 
  updateClassAttendance,
  getMonthlyClassReport,
  getCustomDateRangeReport,
  getStudentHistory,
  checkMarkingStatus
} = require('../../controllers/teacher/attendance/TeacherClassController');

// Get all classes assigned to a teacher
router.get('/getTeacherClasses', authMiddleware, isTeacher, getTeacherClasses);

// Dashboard status to check if today's attendance is marked
router.get('/checkMarkingStatus', authMiddleware, isTeacher, checkMarkingStatus);

// Get student list by class_section_id
router.get('/getClassStudentList/:class_section_id', authMiddleware, isTeacher, getClassStudentList);

// Get students by class_id
router.get('/getStudentsByClass/:class_id', authMiddleware, isTeacher, getStudentsByClass);

// Mark attendance for class
router.post('/markClassAttendance', authMiddleware, isTeacher, markClassAttendance);

// Update attendance for current date only
router.patch('/updateClassAttendance', authMiddleware, isTeacher, updateClassAttendance);

// Get class attendance by date
router.get('/getClassAttendanceByDate', authMiddleware, isTeacher, getClassAttendanceByDate);

// Monthly Grid Report (dates 1-31)
router.get('/getMonthlyClassReport', authMiddleware, isTeacher, getMonthlyClassReport);

// Custom Range Report (Summary with percentage)
router.get('/getCustomDateRangeReport', authMiddleware, isTeacher, getCustomDateRangeReport);

// Individual Student History View
router.get('/getStudentHistory/:student_id', authMiddleware, isTeacher, getStudentHistory);

module.exports = router;
