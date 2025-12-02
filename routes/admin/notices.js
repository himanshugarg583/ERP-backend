const express = require('express');
const router = express.Router();
const {authMiddleware,isAdmin} = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice
} = require('../../controllers/admin/notices/noticeController');

// Configure multer for notice attachments
const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const upload = createUploader('notices', allowedTypes);

// Create notice
router.post('/createNotices', authMiddleware,isAdmin, upload.single('attachment'), createNotice);

// Get all notices
router.get('/getAllNotices', authMiddleware,isAdmin, getAllNotices);

// Get single notice
router.get('/getNotice/:notice_id', authMiddleware,isAdmin, getNoticeById);

// Update notice
router.put('/updateNotice/:notice_id', authMiddleware,isAdmin, upload.single('attachment'), updateNotice);

// Delete notice
router.delete('/deleteNotice/:notice_id', authMiddleware,isAdmin, deleteNotice);

module.exports = router;
