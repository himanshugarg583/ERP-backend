const express = require('express');
const router = express.Router();

// Import FeeHead controller
const {
  createFeeHead,
  getAllFeeHeads,
  
  updateFeeHead,
  deleteFeeHead,
  

  
} = require('../../controllers/admin/fees/FeeHeadController');

// Import middleware (adjust path as needed)
const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');


router.post('/createFeeHead', authMiddleware, isAdmin, createFeeHead);
router.get('/getAllFeeHeads', authMiddleware, isAdmin, getAllFeeHeads);
router.put('/updateFeeHead/:id', authMiddleware, isAdmin, updateFeeHead);

router.delete('/deleteFeeHead/:id', authMiddleware, isAdmin, deleteFeeHead);

module.exports = router;