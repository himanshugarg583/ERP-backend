const express = require('express');
const router = express.Router();
const {authMiddleware,isStudent} = require('../../middlewares/authMiddleware');
const {
  getNoticesForMe
} = require('../../controllers/student/notices/studentNoticeController');

// Get notices FOR this student (received notices)
router.get('/getNoticesForMe', authMiddleware,isStudent, getNoticesForMe);

module.exports = router;
