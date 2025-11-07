const express = require('express');
const router = express.Router();

const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const {markClassAttendance } = require('../../controllers/admin/Student Attendance/MakeClassAttendance');
const { getAllAvailableClasses, getStudentsByClass } = require('../../controllers/admin/Student Attendance/GetAllClasses');


// Get all available classes
router.get('/getAllClasses', authMiddleware, isAdmin, getAllAvailableClasses);

// Get all students of a specific class
router.get('/getStudentsByClass/:class_id', authMiddleware, isAdmin, getStudentsByClass);

// Mark class attendance
router.post('/markClassAttendance', authMiddleware, isAdmin, markClassAttendance);



module.exports = router;
