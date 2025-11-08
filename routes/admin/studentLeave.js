const express = require('express');
const router = express.Router();

const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const createUploader = require('../../utils/multerHelper');
const leaveUpload = createUploader('studentLeaveDocuments', [
  'image/jpeg', 
  'image/png', 
  'image/jpg', 
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const { 
  applyLeave,
  getAllLeaves,
  getSingleLeave,
  updateLeaveStatus,
  cancelLeave
} = require('../../controllers/admin/Student Attendance/StudentLeave');

// Apply for leave (admin can add leave on behalf of student)
router.post('/applyLeave', authMiddleware, isAdmin, leaveUpload.single('attachment'), applyLeave);

// Get all leaves with filters
router.get('/getAllLeaves', authMiddleware, isAdmin, getAllLeaves);

// Get single leave by ID
router.get('/getLeave/:id', authMiddleware, isAdmin, getSingleLeave);

// Update leave status (approve or reject)
router.put('/updateLeaveStatus/:id', authMiddleware, isAdmin, updateLeaveStatus);



module.exports = router;
