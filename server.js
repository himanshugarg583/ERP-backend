// server.js
const express = require("express");
require('dotenv').config();
const sequelize = require('./config/db'); // Import database connection
const app = express();
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
const holidayRoutes = require('./routes/admin/holidayRoutes');
const feesV1Routes = require('./routes/fees/v1');
const incomeExpenseRoutes = require('./routes/admin/incomeExpenseRoutes');
const incomeRoutes = require('./routes/admin/incomeRoutes');
const expenseRoutes = require('./routes/admin/expenseRoutes');
const examV2AdminRoutes = require('./routes/admin/exam/examV2Routes');
const settingRoutes = require('./routes/admin/setting');
const classTimetableRoutes = require('./routes/admin/classTimetableRoutes');
const certificateRoutes = require('./routes/admin/certificate');
const noticeRoutes = require('./routes/admin/notices');
const classResourceRoutes = require('./routes/admin/classResourceRoutes');
const subjectResourceRoutes = require('./routes/admin/subjectResourceRoutes');
const dashboardRoutes = require('./routes/admin/dashboardRoutes');
// teacher
const classattendanceRoutes = require('./routes/teacher/classAttendanceRoutes');
const teacherTimetableRoutes = require('./routes/teacher/teacherTimetableRoutes');
const teacherSubjectRoutes = require('./routes/teacher/teacherSubjectRoutes');
const teacherSettingRoutes = require('./routes/teacher/teacherSettingRoutes');
const teacherNoticeRoutes = require('./routes/teacher/teacherNoticeRoutes');
const teacherClassResourceRoutes = require('./routes/teacher/teacherClassResourceRoutes');
const teacherSubjectResourceRoutes = require('./routes/teacher/teacherSubjectResourceRoutes');
const teacherDashboardRoutes = require('./routes/teacher/teacherDashboardRoutes');
const teacherExamV2Routes = require('./routes/teacher/teacherExamV2Routes');
// accountant
const accountantRoutes = require('./routes/Accountant/accountantRoutes');
// student
const studentRoutes = require('./routes/student/studentRoutes');
const studentSettingRoutes = require('./routes/student/settingRoutes');
const studentLeaveStudentRoutes = require('./routes/student/studentLeave');
const studentNoticeRoutes = require('./routes/student/studentNoticeRoutes');
const studentResourceRoutes = require('./routes/student/studentResourceRoutes');
const studentExamV2Routes = require('./routes/student/studentExamV2Routes');
const studentDashboardRoutes = require('./routes/student/studentDashboardRoutes');
const { startFeeSchedulers } = require('./services/fees/v1/scheduler');
const swaggerUi = require('swagger-ui-express');
const feesV1SwaggerSpec = require('./docs/feesV1Swagger');

const cors = require('cors');
const path = require('path');

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from public folder (for test pages)
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/api/docs/fees-v1.json', (req, res) => {
  res.json(feesV1SwaggerSpec);
});

app.use(
  '/api/docs/fees-v1',
  swaggerUi.serve,
  swaggerUi.setup(feesV1SwaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true
    }
  })
);


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
app.use('/admin/holiday', holidayRoutes);
// fees (BRD-compliant v1)
app.use('/api/v1/fees', feesV1Routes);
app.use('/admin/incomeExpense', incomeExpenseRoutes);
app.use('/admin/income', incomeRoutes);
app.use('/admin/expense', expenseRoutes);
app.use('/admin/setting', settingRoutes);
app.use('/admin/timetable', classTimetableRoutes);
app.use('/api/v2/admin/exam', examV2AdminRoutes);
app.use('/admin/certificate', certificateRoutes);
app.use('/admin/notice', noticeRoutes);
app.use('/admin/classResource', classResourceRoutes);
app.use('/admin/subjectResource', subjectResourceRoutes);
app.use('/admin/dashboard', dashboardRoutes);

// TEACHER ROUTES
app.use('/classattendance', classattendanceRoutes);
app.use('/teacherTimetable', teacherTimetableRoutes);
app.use('/teacher/subject', teacherSubjectRoutes);
app.use('/teacher/setting', teacherSettingRoutes);
app.use('/teacher/notice', teacherNoticeRoutes);
app.use('/teacher/classResource', teacherClassResourceRoutes);
app.use('/teacher/subjectResource', teacherSubjectResourceRoutes);
app.use('/teacher/dashboard', teacherDashboardRoutes);
app.use('/api/v2/teacher/exam', teacherExamV2Routes);

// ACCOUNTANT ROUTES
app.use('/api/accountant', accountantRoutes);

// STUDENT ROUTES
app.use('/studentattendance', studentRoutes);
app.use('/student/setting', studentSettingRoutes);
app.use('/student/leave', studentLeaveStudentRoutes);
app.use('/student/notice', studentNoticeRoutes);
app.use('/student/resources', studentResourceRoutes);
app.use('/api/v2/student/exam', studentExamV2Routes);
app.use('/student/dashboard', studentDashboardRoutes);


// Start server only after database connection is established
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Ensure DB connectivity; schema should be managed by migrations.
    await sequelize.authenticate();
    
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      startFeeSchedulers();

    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Server startup failed due to database issues.');
    process.exit(1);
  }
};

startServer();
