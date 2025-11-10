const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const { 
  createTimetable,
  getTimetableByClass,
  deleteTimetableEntry,
  saveWeekTimetable,
  bulkCreateTimetable,
  checkTeacherClash,
  getTimetableByTeacher
} = require('../../controllers/admin/classTimeTable/ClassTimetableController');

// Create single timetable entry
router.post('/create', authMiddleware, isAdmin, createTimetable);

// Get timetable by class
router.get('/getByClass/:class_id', getTimetableByClass);

// Get timetable by teacher (using user_id)
router.get('/getByTeacher/:user_id', getTimetableByTeacher);

// Delete timetable entry
router.delete('/delete/:id', authMiddleware, isAdmin, deleteTimetableEntry);

// Save whole week timetable (NEW - UI Friendly)
router.post('/saveWeek', authMiddleware, isAdmin, saveWeekTimetable);

// Bulk create timetable for whole week (Old method - backward compatibility)
router.post('/bulkCreate', authMiddleware, isAdmin, bulkCreateTimetable);

// Check teacher clash
router.post('/checkClash', checkTeacherClash);

module.exports = router;
