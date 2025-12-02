const express = require('express');
const router = express.Router();
const {authMiddleware,isTeacher} = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const {
  createNotice,
  getMyNotices,
  getNoticesForMe,
  updateNotice,
  deleteNotice
} = require('../../controllers/teacher/notices/teacherNoticeController');

// Configure multer for notice attachments
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const upload = createUploader('notices', allowedTypes);

// Create notice
router.post('/createNotice', authMiddleware,isTeacher, upload.single('attachment'), createNotice);

// Get teacher's own notices (created by teacher)
router.get('/getMyNotices', authMiddleware,isTeacher, getMyNotices);

// Get notices FOR this teacher (received notices)
router.get('/getNoticesForMe', authMiddleware,isTeacher, getNoticesForMe);

// Update notice
router.put('/updateNotice/:notice_id', authMiddleware,isTeacher, upload.single('attachment'), updateNotice);

// Delete notice
router.delete('/deleteNotice/:notice_id', authMiddleware,isTeacher, deleteNotice);

module.exports = router;
