// server.js
const express = require("express");
require('dotenv').config();
const sequelize = require('./config/db'); // Import database connection
const app = express();
app.use(express.json()); // to parse JSON
const authRoutes = require('./routes/authRoutes');

const adminRoutes = require('./routes/admin/adminRoute');
const studentInfo = require('./routes/admin/studentInfo');
const AdmissionEnquiry = require('./routes/admin/admissionEnqueryRoute');
const Classsection = require('./routes/admin/classSectionRoute');
const Subjectsection = require('./routes/admin/subjectRoute');
const dropdown = require('./routes/admin/dropdown');
const hr = require('./routes/admin/hr');
const studentsAttendance = require('./routes/admin/studentAttendance');
const studentLeaveRoutes = require('./routes/admin/studentLeave');
const feesRoutes = require('./routes/admin/feeHeadRoutes');
const feesStructureRoutes = require('./routes/admin/feeStructureRoutes');
const studentFeeRoutes = require('./routes/admin/studentFeeRoutes');
const studentFeeInstallmentRoutes = require('./routes/admin/studentFeeInstallmentRoutes');
const incomeExpenseRoutes = require('./routes/admin/incomeExpenseRoutes');
const incomeRoutes = require('./routes/admin/incomeRoutes');
const expenseRoutes = require('./routes/admin/expenseRoutes');
const examTermRoutes = require('./routes/admin/exam/examTermRoutes');
const examRoutes = require('./routes/admin/exam/examRoutes');
const examTimetableRoutes = require('./routes/admin/exam/examTimetableRoutes');
const examMarkRoutes = require('./routes/admin/exam/examMarkRoutes');
const admitCardRoutes = require('./routes/admin/exam/admitCardRoutes');
const settingRoutes = require('./routes/admin/setting');
const classTimetableRoutes = require('./routes/admin/classTimetableRoutes');
const certificateRoutes = require('./routes/admin/certificate');
const noticeRoutes = require('./routes/admin/notices');
// teacher
const classattendanceRoutes = require('./routes/teacher/classAttendanceRoutes');
const teacherTimetableRoutes = require('./routes/teacher/teacherTimetableRoutes');
const teacherSubjectRoutes = require('./routes/teacher/teacherSubjectRoutes');
const teacherSettingRoutes = require('./routes/teacher/teacherSettingRoutes');
const teacherNoticeRoutes = require('./routes/teacher/teacherNoticeRoutes');
// student
const studentRoutes = require('./routes/student/studentRoutes');
const studentSettingRoutes = require('./routes/student/settingRoutes');
const studentFeesRoutes = require('./routes/student/studentFees');
const studentLeaveStudentRoutes = require('./routes/student/studentLeave');
const studentNoticeRoutes = require('./routes/student/studentNoticeRoutes');


const Joi = require('joi');
const cors = require('cors');
const path = require('path');

app.use(cors());
app.use(express.json());

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('API is running...');
});


app.use('/api/auth', authRoutes);

// ADMIN ROUTES
app.use('/api/admin', adminRoutes);
app.use('/api/admissionenquiry', AdmissionEnquiry);
app.use('/api/Classsection', Classsection);
app.use('/admin/Subject', Subjectsection);
app.use('/admin/studentInfo', studentInfo);
app.use('/admin/dropdown', dropdown);
app.use('/admin/hr', hr);
app.use('/admin/studentsAttendance', studentsAttendance);
app.use('/admin/studentLeave', studentLeaveRoutes);
app.use('/admin/fees', feesRoutes);
app.use('/admin/feeStructure', feesStructureRoutes);
app.use('/admin/studentFee', studentFeeRoutes);
app.use('/admin/studentFeeInstallment', studentFeeInstallmentRoutes);
app.use('/admin/incomeExpense', incomeExpenseRoutes);
app.use('/admin/income', incomeRoutes);
app.use('/admin/expense', expenseRoutes);
app.use('/admin/setting', settingRoutes);
app.use('/admin/timetable', classTimetableRoutes);
app.use('/admin/examTerm', examTermRoutes);
app.use('/admin/exam', examRoutes);
app.use('/admin/examTimetable', examTimetableRoutes);
app.use('/admin/examMark', examMarkRoutes);
app.use('/admin/admitCard', admitCardRoutes);
app.use('/admin/certificate', certificateRoutes);
app.use('/admin/notice', noticeRoutes);

// TEACHER ROUTES
app.use('/classattendance', classattendanceRoutes);
app.use('/teacherTimetable', teacherTimetableRoutes);
app.use('/teacher/subject', teacherSubjectRoutes);
app.use('/teacher/setting', teacherSettingRoutes);
app.use('/teacher/notice', teacherNoticeRoutes);

// STUDENT ROUTES
app.use('/studentattendance', studentRoutes);
app.use('/student/setting', studentSettingRoutes);
app.use('/student/fees', studentFeesRoutes);
app.use('/student/leave', studentLeaveStudentRoutes);
app.use('/student/notice', studentNoticeRoutes);


// Start server only after database connection is established
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Sync database models (optional - creates tables if they don't exist)
    await sequelize.sync();
    
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Server startup failed due to database issues.');
    process.exit(1);
  }
};

startServer();