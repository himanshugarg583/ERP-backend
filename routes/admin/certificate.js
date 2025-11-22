const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { generateStudentIdCard, generateMultipleIdCards } = require('../../controllers/admin/certificate/idCardController');
const { generateStaffIdCard, generateMultipleStaffIdCards } = require('../../controllers/admin/certificate/staffIdCardController');

// Student ID cards
router.post('/generateIdCard', authMiddleware, generateStudentIdCard);
router.post('/generateMultipleIdCards', authMiddleware, generateMultipleIdCards);

// Staff ID cards
router.post('/generateStaffIdCard', authMiddleware, generateStaffIdCard);
router.post('/generateMultipleStaffIdCards', authMiddleware, generateMultipleStaffIdCards);

module.exports = router;
