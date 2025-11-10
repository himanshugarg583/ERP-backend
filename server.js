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
const examTermRoutes = require('./routes/admin/examTermRoutes');
const settingRoutes = require('./routes/admin/setting');
const classTimetableRoutes = require('./routes/admin/classTimetableRoutes');


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
app.use('/admin/examTerm', examTermRoutes);
app.use('/admin/setting', settingRoutes);
app.use('/admin/timetable', classTimetableRoutes);



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