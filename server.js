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
const adminFeeWebhookRoutes = require('./routes/admin/fees/webhookRoutes');
const adminFeeHeadRoutes = require('./routes/admin/fees/feeHeadRoutes');
const adminFeeStructureRoutes = require('./routes/admin/fees/feeStructureRoutes');
const adminInstallmentRoutes = require('./routes/admin/fees/installmentRoutes');
const adminAssignmentRoutes = require('./routes/admin/fees/assignmentRoutes');
const adminInvoiceRoutes = require('./routes/admin/fees/invoiceRoutes');
const adminPaymentRoutes = require('./routes/admin/fees/paymentRoutes');
const adminRefundRoutes = require('./routes/admin/fees/refundRoutes');
const adminReportRoutes = require('./routes/admin/fees/reportRoutes');
const adminReminderRoutes = require('./routes/admin/fees/reminderRoutes');
const examV2AdminRoutes = require('./routes/admin/exam/examV2Routes');
const settingRoutes = require('./routes/admin/setting');
const classTimetableRoutes = require('./routes/admin/classTimetableRoutes');
const certificateRoutes = require('./routes/admin/certificate');
const noticeRoutes = require('./routes/admin/notices');
const classResourceRoutes = require('./routes/admin/classResourceRoutes');
const subjectResourceRoutes = require('./routes/admin/subjectResourceRoutes');
const dashboardRoutes = require('./routes/admin/dashboardRoutes');
const adminIncomeRoutes = require('./routes/admin/incomeRoutes');
const adminExpenseRoutes = require('./routes/admin/expenseRoutes');
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
const accountantFeeWebhookRoutes = require('./routes/Accountant/fees/webhookRoutes');
const accountantFeeHeadRoutes = require('./routes/Accountant/fees/feeHeadRoutes');
const accountantFeeStructureRoutes = require('./routes/Accountant/fees/feeStructureRoutes');
const accountantInstallmentRoutes = require('./routes/Accountant/fees/installmentRoutes');
const accountantAssignmentRoutes = require('./routes/Accountant/fees/assignmentRoutes');
const accountantInvoiceRoutes = require('./routes/Accountant/fees/invoiceRoutes');
const accountantPaymentRoutes = require('./routes/Accountant/fees/paymentRoutes');
const accountantRefundRoutes = require('./routes/Accountant/fees/refundRoutes');
const accountantReportRoutes = require('./routes/Accountant/fees/reportRoutes');
const accountantReminderRoutes = require('./routes/Accountant/fees/reminderRoutes');
// student
const studentRoutes = require('./routes/student/studentRoutes');
const studentInvoiceRoutes = require('./routes/student/fees/invoiceRoutes');
const studentAssignmentRoutes = require('./routes/student/fees/assignmentRoutes');
const studentPaymentRoutes = require('./routes/student/fees/paymentRoutes');
const studentReportRoutes = require('./routes/student/fees/reportRoutes');
const studentSettingRoutes = require('./routes/student/settingRoutes');
const studentLeaveStudentRoutes = require('./routes/student/studentLeave');
const studentNoticeRoutes = require('./routes/student/studentNoticeRoutes');
const studentResourceRoutes = require('./routes/student/studentResourceRoutes');
const studentExamV2Routes = require('./routes/student/studentExamV2Routes');
const studentDashboardRoutes = require('./routes/student/studentDashboardRoutes');
const teacherInvoiceRoutes = require('./routes/teacher/fees/invoiceRoutes');
const teacherAssignmentRoutes = require('./routes/teacher/fees/assignmentRoutes');
const teacherReportRoutes = require('./routes/teacher/fees/reportRoutes');
const { startFeeSchedulers } = require('./services/fees/v1/scheduler');
// const swaggerUi = require('swagger-ui-express');
// const feesV1SwaggerSpec = require('./docs/feesV1Swagger');

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
// fees (role-specific routes)
app.use('/api/admin/fees', adminFeeWebhookRoutes);
app.use('/api/admin/fees', adminFeeHeadRoutes);
app.use('/api/admin/fees', adminFeeStructureRoutes);
app.use('/api/admin/fees', adminInstallmentRoutes);
app.use('/api/admin/fees', adminAssignmentRoutes);
app.use('/api/admin/fees', adminInvoiceRoutes);
app.use('/api/admin/fees', adminPaymentRoutes);
app.use('/api/admin/fees', adminRefundRoutes);
app.use('/api/admin/fees', adminReportRoutes);
app.use('/api/admin/fees', adminReminderRoutes);

app.use('/api/accountant/fees', accountantFeeWebhookRoutes);
app.use('/api/accountant/fees', accountantFeeHeadRoutes);
app.use('/api/accountant/fees', accountantFeeStructureRoutes);
app.use('/api/accountant/fees', accountantInstallmentRoutes);
app.use('/api/accountant/fees', accountantAssignmentRoutes);
app.use('/api/accountant/fees', accountantInvoiceRoutes);
app.use('/api/accountant/fees', accountantPaymentRoutes);
app.use('/api/accountant/fees', accountantRefundRoutes);
app.use('/api/accountant/fees', accountantReportRoutes);
app.use('/api/accountant/fees', accountantReminderRoutes);

app.use('/api/teacher/fees', teacherInvoiceRoutes);
app.use('/api/teacher/fees', teacherAssignmentRoutes);
app.use('/api/teacher/fees', teacherReportRoutes);

app.use('/api/student/fees', studentInvoiceRoutes);
app.use('/api/student/fees', studentAssignmentRoutes);
app.use('/api/student/fees', studentPaymentRoutes);
app.use('/api/student/fees', studentReportRoutes);
app.use('/admin/setting', settingRoutes);
app.use('/admin/timetable', classTimetableRoutes);
app.use('/api/v2/admin/exam', examV2AdminRoutes);
app.use('/admin/certificate', certificateRoutes);
app.use('/admin/notice', noticeRoutes);
app.use('/admin/classResource', classResourceRoutes);
app.use('/admin/subjectResource', subjectResourceRoutes);
app.use('/admin/dashboard', dashboardRoutes);
app.use('/api/admin', adminIncomeRoutes);
app.use('/api/admin', adminExpenseRoutes);

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
