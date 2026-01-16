const { Student } = require('../../../models/admin/Student');
const { Teacher } = require('../../../models/admin/Teacher');
const { studentsAttendances } = require('../../../models/admin/studentsAttendances');
const { IncomeExpense } = require('../../../models/admin/fees/IncomeExpense');
const { FeePayment } = require('../../../models/admin/fees/FeePayment');
const { StudentFee } = require('../../../models/admin/fees/StudentFee');
const { FeeInstallment } = require('../../../models/admin/fees/FeeInstallment');
const { ClassSection } = require('../../../models/admin/Classsection');
const { Notice } = require('../../../models/admin/notices/notices');
const { NoticeTarget } = require('../../../models/admin/notices/notice_targets');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');

/**
 * Get Dashboard Statistics
 * Returns counts for students, teachers, and today's attendance
 */
const getDashboardStats = async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // 1. Total Students Count
    const totalStudents = await Student.count();

    // 2. Total Male Students
    const totalMaleStudents = await Student.count({
      where: { gender: 'male' }
    });

    // 3. Total Female Students
    const totalFemaleStudents = await Student.count({
      where: { gender: 'female' }
    });

    // 4. Total Teachers Count
    const totalTeachers = await Teacher.count();

    // 5. Total Male Teachers
    const totalMaleTeachers = await Teacher.count({
      where: { gender: 'male' }
    });

    // 6. Total Female Teachers
    const totalFemaleTeachers = await Teacher.count({
      where: { gender: 'female' }
    });

    // 7. Students Present Today
    const studentsPresentToday = await studentsAttendances.count({
      where: {
        date: todayDate,
        status: 'present'
      }
    });

    // 8. Students Absent Today
    const studentsAbsentToday = await studentsAttendances.count({
      where: {
        date: todayDate,
        status: 'absent'
      }
    });

    // 9. Students on Leave Today
    const studentsOnLeaveToday = await studentsAttendances.count({
      where: {
        date: todayDate,
        status: 'leave'
      }
    });

    // 10. Total Attendance Marked Today
    const totalAttendanceMarkedToday = await studentsAttendances.count({
      where: {
        date: todayDate,
        status: { [Op.ne]: null }
      }
    });

    // Calculate attendance percentage
    const attendancePercentage = totalAttendanceMarkedToday > 0 
      ? ((studentsPresentToday / totalAttendanceMarkedToday) * 100).toFixed(2)
      : 0;

    // Prepare response data
    const dashboardData = {
      students: {
        total: totalStudents,
        male: totalMaleStudents,
        female: totalFemaleStudents,
        other: totalStudents - (totalMaleStudents + totalFemaleStudents)
      },
      teachers: {
        total: totalTeachers,
        male: totalMaleTeachers,
        female: totalFemaleTeachers,
        other: totalTeachers - (totalMaleTeachers + totalFemaleTeachers)
      },
      todayAttendance: {
        date: todayDate,
        present: studentsPresentToday,
        absent: studentsAbsentToday,
        onLeave: studentsOnLeaveToday,
        totalMarked: totalAttendanceMarkedToday,
        notMarked: totalStudents - totalAttendanceMarkedToday,
        attendancePercentage: parseFloat(attendancePercentage)
      },
      summary: {
        totalStudents,
        totalTeachers,
        totalStaff: totalTeachers,
        activeToday: studentsPresentToday
      }
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Dashboard statistics fetched successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get Monthly Income and Expense for Graph
 * Returns monthly aggregated data for the current year or specified year
 */
const getMonthlyIncomeExpense = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get start and end date for the year
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // Fetch all income and expense entries for the year
    const entries = await IncomeExpense.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('entry_date')), 'month'],
        'entry_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        entry_date: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['month', 'entry_type'],
      order: [[sequelize.fn('MONTH', sequelize.col('entry_date')), 'ASC']],
      raw: true
    });

    // Initialize monthly data structure
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const monthlyData = monthNames.map((name, index) => ({
      month: name,
      monthNumber: index + 1,
      income: 0,
      expense: 0
    }));

    // Populate the data
    entries.forEach(entry => {
      const monthIndex = parseInt(entry.month) - 1;
      const amount = parseFloat(entry.total);
      
      if (entry.entry_type === 'income') {
        monthlyData[monthIndex].income = amount;
      } else if (entry.entry_type === 'expense') {
        monthlyData[monthIndex].expense = amount;
      }
    });

    // Calculate totals
    const totalIncome = monthlyData.reduce((sum, month) => sum + month.income, 0);
    const totalExpense = monthlyData.reduce((sum, month) => sum + month.expense, 0);
    const netProfit = totalIncome - totalExpense;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Monthly income and expense data fetched successfully',
      data: {
        year: currentYear,
        months: monthlyData,
        summary: {
          totalIncome: parseFloat(totalIncome.toFixed(2)),
          totalExpense: parseFloat(totalExpense.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          profitPercentage: totalIncome > 0 ? parseFloat(((netProfit / totalIncome) * 100).toFixed(2)) : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching monthly income/expense:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch monthly income and expense data',
      error: error.message
    });
  }
};

/**
 * Get Class-wise Today's Attendance
 * Returns attendance summary grouped by class/section
 */
const getClassWiseTodayAttendance = async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    // Fetch all classes/sections with their attendance data
    const classAttendance = await studentsAttendances.findAll({
      attributes: [
        'class_section_id',
        'status',
        [sequelize.fn('COUNT', sequelize.col('studentsAttendances.id')), 'count']
      ],
      where: {
        date: todayDate,
        status: {
          [Op.in]: ['present', 'absent']
        }
      },
      include: [
        {
          model: ClassSection,
          as: 'class_section',
          attributes: ['class_name', 'section_name']
        }
      ],
      group: ['class_section_id', 'status', 'class_section.id'],
      raw: true
    });

    // Organize attendance data by class
    const classAttendanceMap = {};
    
    classAttendance.forEach(record => {
      const classId = record.class_section_id;
      const className = record['class_section.class_name'];
      const sectionName = record['class_section.section_name'];
      const classWithSection = `${className} ${sectionName}`;
      
      if (!classAttendanceMap[classId]) {
        classAttendanceMap[classId] = {
          class: classWithSection,
          present: 0,
          absent: 0
        };
      }

      const count = parseInt(record.count);
      if (record.status === 'present') {
        classAttendanceMap[classId].present = count;
      } else if (record.status === 'absent') {
        classAttendanceMap[classId].absent = count;
      }
    });

    // Convert to array and sort
    const attendanceData = Object.values(classAttendanceMap);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class-wise today attendance fetched successfully',
      data: attendanceData
    });

  } catch (error) {
    console.error('Error fetching class-wise attendance:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch class-wise attendance',
      error: error.message
    });
  }
};

/**
 * Get All Notices
 * Returns all notices with their target information
 */
const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.findAll({
      attributes: ['title', 'message', 'attachment'],
      include: [
        {
          model: NoticeTarget,
          as: 'targets',
          attributes: ['target_type']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Format the response to flatten target_type
    const formattedNotices = notices.map(notice => {
      const noticeData = notice.toJSON();
      return {
        title: noticeData.title,
        message: noticeData.message,
        target: noticeData.targets && noticeData.targets.length > 0 
          ? noticeData.targets[0].target_type 
          : null,
        attachment: noticeData.attachment
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'All notices fetched successfully',
      data: formattedNotices
    });

  } catch (error) {
    console.error('Error fetching all notices:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch notices',
      error: error.message
    });
  }
};

/**
 * Get Monthly Fee Collection for Graph
 * Returns month-wise fee collection data for the current year or specified year
 */
const getMonthlyFeeCollection = async (req, res) => {
  try {
    const { year, academic_year } = req.query;
    const currentYear = year || new Date().getFullYear();

    // Get start and end date for the year
    const startDate = `${currentYear}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // Build where condition
    const whereCondition = {
      payment_date: {
        [Op.between]: [startDate, endDate]
      },
      payment_status: 'success', // Only successful payments
      is_refund: false // Exclude refunds
    };

    // If academic year is specified, add it to filter
    if (academic_year) {
      whereCondition.academic_year = academic_year;
    }

    // Fetch monthly fee collection data
    const feeData = await FeePayment.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('payment_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('total_paid')), 'total_collected']
      ],
      where: whereCondition,
      group: [sequelize.fn('MONTH', sequelize.col('payment_date'))],
      order: [[sequelize.fn('MONTH', sequelize.col('payment_date')), 'ASC']],
      raw: true
    });

    // Initialize monthly data structure
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyCollection = monthNames.map((name, index) => ({
      month: name,
      amount: 0
    }));

    // Populate the monthly data
    feeData.forEach(entry => {
      const monthIndex = parseInt(entry.month) - 1;
      monthlyCollection[monthIndex].amount = parseFloat(entry.total_collected) || 0;
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Monthly fee collection data fetched successfully',
      data: monthlyCollection
    });

  } catch (error) {
    console.error('Error fetching monthly fee collection:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch monthly fee collection',
      error: error.message
    });
  }
};

/**
 * Get Fee Assignment vs Collection Data
 * Returns total assigned fee and total collected fee from installments
 */
const getFeeAssignmentVsCollection = async (req, res) => {
  try {
    const { academic_year } = req.query;

    // Build where condition
    const whereCondition = {};
    if (academic_year) {
      whereCondition.academic_year = academic_year;
    }

    // Get total assigned fee from StudentFee table
    const feeAssignment = await StudentFee.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('final_amount')), 'total_assigned'],
        [sequelize.fn('SUM', sequelize.col('discount_amount')), 'total_discount']
      ],
      where: whereCondition,
      raw: true
    });

    // Get total collected from FeePayment table
    const paymentWhereCondition = { payment_status: 'success', is_refund: false };
    if (academic_year) {
      paymentWhereCondition.academic_year = academic_year;
    }

    const feeCollection = await FeePayment.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'total_collected'],
        [sequelize.fn('SUM', sequelize.col('late_fee_paid')), 'total_fine']
      ],
      where: paymentWhereCondition,
      raw: true
    });

    const assignment = feeAssignment[0] || {};
    const collection = feeCollection[0] || {};

    const totalAssigned = parseFloat(assignment.total_assigned) || 0;
    const totalCollected = parseFloat(collection.total_collected) || 0;
    const totalFine = parseFloat(collection.total_fine) || 0;
    const totalDiscount = parseFloat(assignment.total_discount) || 0;
    const totalDue = totalAssigned - totalCollected;

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Fee assignment vs collection data fetched successfully',
      data: {
        total_fee_assigned: totalAssigned,
        total_collected: totalCollected,
        total_fine_collected: totalFine,
        total_discount: totalDiscount,
        total_due: totalDue
      }
    });

  } catch (error) {
    console.error('Error fetching fee assignment vs collection:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch fee assignment vs collection',
      error: error.message
    });
  }
};

/**
 * Get Payment Mode Wise Collection
 * Returns payment method wise breakdown from FeePayment table
 */
const getPaymentModeCollection = async (req, res) => {
  try {
    const { academic_year, year } = req.query;

    // Build where condition
    const whereCondition = {
      payment_status: 'success', // Only successful payments
      is_refund: false // Exclude refunds
    };

    if (academic_year) {
      whereCondition.academic_year = academic_year;
    }

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      whereCondition.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Get payment method wise data
    const paymentData = await FeePayment.findAll({
      attributes: [
        'payment_method',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
        [sequelize.fn('SUM', sequelize.col('total_paid')), 'total_amount']
      ],
      where: whereCondition,
      group: ['payment_method'],
      raw: true
    });

    // Format the response
    const paymentModes = paymentData.map(mode => ({
      payment_mode: mode.payment_method,
      total_transactions: parseInt(mode.total_transactions) || 0,
      total_amount: parseFloat(mode.total_amount) || 0
    }));

    // Calculate grand total
    const grandTotal = paymentModes.reduce((sum, mode) => sum + mode.total_amount, 0);
    const totalTransactions = paymentModes.reduce((sum, mode) => sum + mode.total_transactions, 0);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Payment mode wise collection data fetched successfully',
      data: {
        payment_modes: paymentModes,
        summary: {
          total_transactions: totalTransactions,
          grand_total: parseFloat(grandTotal.toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching payment mode collection:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Failed to fetch payment mode collection',
      error: error.message
    });
  }
};


module.exports = {
  getDashboardStats,
  getMonthlyIncomeExpense,
  getClassWiseTodayAttendance,
  getAllNotices,
  getMonthlyFeeCollection,
  getFeeAssignmentVsCollection,
  getPaymentModeCollection
};