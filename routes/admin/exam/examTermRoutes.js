const express = require('express');
const router = express.Router();

// Import ExamTerm controller
const {
  createExamTerm,
  getAllExamTerms,
  getSingleExamTerm,
  updateExamTerm,
  deleteExamTerm,
 
} = require('../../../controllers/admin/Exam/ExamTermController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../../middlewares/authMiddleware');

// Specific routes first (before parameterized routes)
router.post('/createExamTerm', authMiddleware, isAdmin, createExamTerm);
router.get('/getAllExamTerms', authMiddleware, isAdmin, getAllExamTerms);
router.get('/getSingleExamTerm/:id', authMiddleware, isAdmin, getSingleExamTerm);
router.put('/updateExamTerm/:id', authMiddleware, isAdmin, updateExamTerm);
router.delete('/deleteExamTerm/:id', authMiddleware, isAdmin, deleteExamTerm);


module.exports = router;
