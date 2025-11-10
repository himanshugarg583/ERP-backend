const express = require('express');
const router = express.Router();

const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const { changePassword } = require('../../controllers/admin/setting/changePassword');
const { getProfile } = require('../../controllers/admin/setting/profile');

// Get Profile
router.get('/profile', authMiddleware, getProfile);

// Change Password
router.post('/changePassword', authMiddleware, isAdmin, changePassword);

module.exports = router;
