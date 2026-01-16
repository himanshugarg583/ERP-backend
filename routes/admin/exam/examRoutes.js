const express = require('express');
const router = express.Router();
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');
const {
  createExam,
  getAllExams,
  getSingleExam,
  updateExam,
  deleteExam
} = require('../../../controllers/admin/Exam/ExamController');

// Create exam
router.post('/createExam', authMiddleware, isAdmin, createExam);
router.get('/getAllExams', getAllExams);
router.get('/getSingleExam/:id', getSingleExam);
router.put('/updateExam/:id', authMiddleware, isAdmin, updateExam);
router.delete('/deleteExam/:id', authMiddleware, isAdmin, deleteExam);


module.exports = router;
