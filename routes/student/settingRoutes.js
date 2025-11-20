const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getStudentProfile } = require('../../controllers/student/settings/studentProfileController');

// Get student profile (user_id from token)
router.get('/getProfile', authMiddleware, getStudentProfile);

module.exports = router;