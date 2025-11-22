const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getTeacherSubjects } = require('../../controllers/teacher/subject/teacherSubjectController');

// Get teacher subjects (user_id from token)
router.get('/getMySubjects', authMiddleware, getTeacherSubjects);

module.exports = router;
