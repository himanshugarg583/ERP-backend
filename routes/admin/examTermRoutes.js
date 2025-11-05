const express = require('express');
const router = express.Router();

// Import ExamTerm controller
const {
  createExamTerm,
  getAllExamTerms,
  getSingleExamTerm,
  updateExamTerm,
  deleteExamTerm,
  getActiveExamTerms,
  getExamTermsByAcademicYear
} = require('../../controllers/admin/exam/ExamTermController');

// Import middleware
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

// Specific routes first (before parameterized routes)
router.post('/create', authMiddleware, isAdmin, createExamTerm);
router.get('/all', authMiddleware, isAdmin, getAllExamTerms);
router.get('/active', authMiddleware, isAdmin, getActiveExamTerms);
router.get('/academicYear/:academic_year', authMiddleware, isAdmin, getExamTermsByAcademicYear);

// Parameterized routes last
router.get('/:id', authMiddleware, isAdmin, getSingleExamTerm);

router.put('/:id', authMiddleware, isAdmin, updateExamTerm);

router.delete('/:id', authMiddleware, isAdmin, deleteExamTerm);

module.exports = router;