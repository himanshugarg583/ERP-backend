const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getTeacherTimetable, getClassTimetable } = require('../../controllers/teacher/timetable/teacherTimetable');

// Get teacher timetable (user_id from token)
router.get('/getTeacherTimetable', authMiddleware, getTeacherTimetable);

// Get class timetable by class_section_id
router.get('/getClassTimetable/:class_section_id', authMiddleware, getClassTimetable);

module.exports = router;
