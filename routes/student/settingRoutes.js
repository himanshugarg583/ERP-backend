const express = require('express');
const router = express.Router();
const { authMiddleware,isStudent } = require('../../middlewares/authMiddleware');
const { getStudentProfile, changeStudentPassword } = require('../../controllers/student/settings/studentProfileController');

// Get student profile (user_id from token)
router.get('/getProfile', authMiddleware,isStudent, getStudentProfile);

// Change student password (user_id from token)
router.put('/changePassword', authMiddleware,isStudent, changeStudentPassword);

module.exports = router;