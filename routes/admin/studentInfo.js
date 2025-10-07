const express = require('express');
const router = express.Router();

const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { getStudentCredentials } = require('../../controllers/admin/student info/getStudentCredentials');
const { getClassDropdown } = require('../../controllers/admin/academics/classController');


const {addStudent,getSingleStudent,updateStudent,
  getStudentStats,getClassWiseStudentStats}= require('../../controllers/admin/student info/Addstudent')

const createUploader = require('../../utils/multerHelper');
const studentUpload = createUploader('studentsDocument');

// teacher routes


// student
router.post('/addStudent', studentUpload.fields([
    { name: 'tc', maxCount: 1 },
    { name: 'marksheet', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'aadhar_card', maxCount: 1 },
    { name: 'sign', maxCount: 1 }
  ]),addStudent);
  router.get('/getSingleStudent/:user_id',getSingleStudent);
  router.patch('/updateStudent/:user_id',updateStudent);
  router.get('/getStudentStats',getStudentStats);
  router.get('/getClassWiseStudentStats',getClassWiseStudentStats);

  router.get('/getClassDropdown',getClassDropdown);
  
  // student crediential
  router.get('/getStudentCredentials',authMiddleware,isAdmin,getStudentCredentials);
  
module.exports = router;
