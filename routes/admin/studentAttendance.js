const express = require('express');
const router = express.Router();

const { authMiddleware,isAdmin } = require('../../middlewares/authMiddleware');
const {markClassAttendance } = require('../../controllers/admin/Student Attendance/MakeClassAttendance');


// teacher routes
router.post('/markClassAttendance',markClassAttendance);



module.exports = router;
