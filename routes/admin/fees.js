const express = require('express');
const router = express.Router();

// Import middlewares
const { authMiddleware, isAdmin, isAccountant } = require('../../middlewares/authMiddleware');

// Import controllers
const {
  createFeeStructure,
  getAllFeeStructures,
  getSingleFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getFeeStructuresByClass,
  getFeeStructureStats
} = require('../../controllers/admin/fees/feeStructureController');


router.post('/structure', authMiddleware, isAdmin, createFeeStructure);

router.get('/structure', authMiddleware, isAdmin, getAllFeeStructures);

router.get('/structure/stats', authMiddleware, isAdmin, getFeeStructureStats);

router.get('/structure/class/:class_section_id', authMiddleware, isAdmin, getFeeStructuresByClass);

router.get('/structure/:id', authMiddleware, isAdmin, getSingleFeeStructure);

router.put('/structure/:id', authMiddleware, isAdmin, updateFeeStructure);

router.delete('/structure/:id', authMiddleware, isAdmin, deleteFeeStructure);

module.exports = router;