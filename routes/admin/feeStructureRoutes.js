const express = require('express');
const router = express.Router();

// Import FeeStructure controller
const {
  createFeeStructure,
  getAllFeeStructures,
  getSingleFeeStructure,
  updateFeeStructure,
  deleteFeeStructure
} = require('../../controllers/admin/fees/feeStructureController');

// Import middleware (adjust path as needed)
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');

router.post('/createFeeStructure', authMiddleware, isAdmin, createFeeStructure);

router.get('/getAllFeeStructures', authMiddleware, isAdmin, getAllFeeStructures);

router.get('/getSingleFeeStructure/:id', authMiddleware, isAdmin, getSingleFeeStructure);

router.put('/updateFeeStructure/:id', authMiddleware, isAdmin, updateFeeStructure);

router.delete('/deleteFeeStructure/:id', authMiddleware, isAdmin, deleteFeeStructure);

module.exports = router;