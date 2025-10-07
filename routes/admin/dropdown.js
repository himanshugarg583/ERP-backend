const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { getTeacherDropdown,getClassDropdown } = require('../../controllers/admin/dropdowns');



router.get('/getTeacherDropdown',getTeacherDropdown);
router.get('/getClassDropdown',getClassDropdown);



module.exports = router;

