const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getTeacherProfile, changeTeacherPassword } = require('../../controllers/teacher/settings/teacherProfileController');

// Get teacher profile (user_id from token)
router.get('/getProfile', authMiddleware, getTeacherProfile);

// Change teacher password (user_id from token)
router.put('/changePassword', authMiddleware, changeTeacherPassword);

module.exports = router;
