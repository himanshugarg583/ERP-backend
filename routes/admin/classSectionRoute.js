const express = require('express');
const router = express.Router();
const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { createClass,getAllClassSections,updateClassSection,DeleteClassSection } = require('../../controllers/admin/academics/classController');


router.post('/createClass',createClass);
router.get('/getAllClassSections',getAllClassSections);
router.put('/updateClassSection/:id',updateClassSection);
router.delete('/DeleteClassSection/:id',DeleteClassSection);


module.exports = router;
