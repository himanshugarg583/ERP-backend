const express = require('express');
const router = express.Router();

const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const { addTeacher ,updateTeacher,
    softDeleteTeacher,
    getdeleteTeachers,
    getAllTeachers,
    reactivateTeacher,
    getSingleTeacher,
    getTeacherStats,
    getTeacherCredentials,
    getTeacherSalary} = require('../../controllers/admin/HR/AddTeacher');
  const { addStaff, getAllStaff } = require('../../controllers/admin/HR/AddStaff');

// const {addStudent,getSingleStudent,updateStudent,
//   getStudentStats,getClassWiseStudentStats}= require('../../controllers/admin/student info/Addstudent')
  const createUploader = require('../../utils/multerHelper');
  const teacherUpload = createUploader('teachers'); 
  const staffUpload = createUploader('staff');

// teacher routes
router.post('/register/addTeacher',teacherUpload.single('image'),addTeacher);
// router.put('/updateTeacher/:userId',updateTeacher);
// router.delete('/softDeleteTeacher/:userId',softDeleteTeacher);
// router.get('/getdeleteTeachers',getdeleteTeachers);
router.get('/getAllTeachers',getAllTeachers);
router.get('/getTeacherCredentials',getTeacherCredentials);
router.get('/getTeacherSalary',getTeacherSalary);

// staff routes
router.post('/register/addStaff', staffUpload.single('image'), addStaff);
router.get('/getAllStaff', getAllStaff);
// router.patch('/reactivateTeacher/:userId',reactivateTeacher);
// router.get('/getSingleTeacher/:userId',getSingleTeacher);
// router.get('/getTeacherStats',getTeacherStats);



module.exports = router;
