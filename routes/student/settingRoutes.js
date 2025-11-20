const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { getStudentProfile, changeStudentPassword } = require('../../controllers/student/settings/studentProfileController');

// Get student profile (user_id from token)
router.get('/getProfile', authMiddleware, getStudentProfile);

// Change student password (user_id from token)
router.put('/changePassword', authMiddleware, changeStudentPassword);

module.exports = router;