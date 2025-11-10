const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { getTeacherDropdown,getClassDropdown,getStudentsByClass } = require('../../controllers/admin/dropdowns');



router.get('/getTeacherDropdown',getTeacherDropdown);
router.get('/getClassDropdown',getClassDropdown);
router.get('/getStudentsByClass/:class_id',getStudentsByClass);



module.exports = router;

