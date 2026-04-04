const express = require('express');
const router = express.Router();

const { authMiddleware, isAdmin } = require('../../middlewares/authMiddleware');
const {
  createHoliday,
  getAllHolidays,
  getHolidayByDate,
  deleteHoliday
} = require('../../controllers/admin/Student Attendance/HolidayController');

router.post('/createHoliday', authMiddleware, isAdmin, createHoliday);
router.get('/getAllHolidays', authMiddleware, isAdmin, getAllHolidays);
router.get('/getHolidayByDate', authMiddleware, isAdmin, getHolidayByDate);
router.delete('/deleteHoliday/:id', authMiddleware, isAdmin, deleteHoliday);

module.exports = router;
