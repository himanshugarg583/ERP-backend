const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { createClass,getAllClassSections,updateClassSection,DeleteClassSection,assignClassTeacher } = require('../../controllers/admin/academics/classController');


router.post('/createClass',createClass);
router.get('/getAllClassSections',getAllClassSections);
router.put('/updateClassSection/:id',updateClassSection);
router.delete('/DeleteClassSection/:id',DeleteClassSection);

// Assign class teacher
router.post('/assignClassTeacher', authMiddleware, isAdmin, assignClassTeacher);


module.exports = router;
