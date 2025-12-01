const express = require('express');
const router = express.Router();
const {authMiddleware,isStudent} = require('../../middlewares/authMiddleware');
const {applyLeave,getMyLeaves,deleteLeave} = require('../../controllers/student/leave/studentLeaveController');

// Apply for leave
router.post('/applyLeave', authMiddleware, isStudent, applyLeave);

// Get all leave applications
router.get('/getMyLeaves', authMiddleware, isStudent, getMyLeaves);

// Delete leave application
router.delete('/deleteLeave/:leave_id', authMiddleware, isStudent, deleteLeave);

module.exports = router;
