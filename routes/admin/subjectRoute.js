const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { addSubject,updateSubject,getSingleSubject,deleteSubject,getSubjectsByClassSection,getAllSubjectsWithDetails } = require('../../controllers/admin/academics/subjectController');


router.post('/addSubject',addSubject);
router.put('/updateSubject/:id',updateSubject);
router.get('/getSingleSubject/:id',getSingleSubject);
router.delete('/deleteSubject/:id',deleteSubject);
router.get('/getSubjectsByClassSection/:class_section_id',getSubjectsByClassSection);
router.get('/getAllSubjectsWithDetails',getAllSubjectsWithDetails);



module.exports = router;

