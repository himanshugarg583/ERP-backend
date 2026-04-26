const { Student } = require('../../../models/admin/Student');
const { Teacher } = require('../../../models/admin/Teacher');
const { studentsAttendances } = require('../../../models/admin/studentsAttendances');
const { IncomeExpense } = require('../../../models/admin/accounting/IncomeExpense');
const { FeePaymentV1, FeeInvoiceV1 } = require('../../../models');
const { ClassSection } = require('../../../models/admin/Classsection');
const { Notice, AudienceTarget } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/db');

const getInvoiceIdsForAcademicYear = async (academicYearId) => {
  if (!academicYearId) return null;
  const rows = await FeeInvoiceV1.findAll({
    where: { academic_year_id: academicYearId },
    attributes: ['id'],
    raw: true
  });
  return rows.map((row) => row.id);
};

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
          model: AudienceTarget,
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
      paid_at: {
        [Op.between]: [startDate, endDate]
      },
      is_cancelled: false
    };

    if (academic_year) {
      const invoiceIds = await getInvoiceIdsForAcademicYear(academic_year);
      if (!invoiceIds.length) {
        return res.status(200).json({
          success: true,
          statusCode: 200,
          message: 'Monthly fee collection data fetched successfully',
          data: [
            { month: 'January', amount: 0 },
            { month: 'February', amount: 0 },
            { month: 'March', amount: 0 },
            { month: 'April', amount: 0 },
            { month: 'May', amount: 0 },
            { month: 'June', amount: 0 },
            { month: 'July', amount: 0 },
            { month: 'August', amount: 0 },
            { month: 'September', amount: 0 },
            { month: 'October', amount: 0 },
            { month: 'November', amount: 0 },
            { month: 'December', amount: 0 }
          ]
        });
      }
      whereCondition.invoice_id = { [Op.in]: invoiceIds };
    }

    // Fetch monthly fee collection data
    const feeData = await FeePaymentV1.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('paid_at')), 'month'],
        [sequelize.literal('SUM(amount_paid + fine_paid)'), 'total_collected']
      ],
      where: whereCondition,
      group: [sequelize.fn('MONTH', sequelize.col('paid_at'))],
      order: [[sequelize.fn('MONTH', sequelize.col('paid_at')), 'ASC']],
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

    const invoiceWhere = {};
    if (academic_year) {
      invoiceWhere.academic_year_id = academic_year;
    }

    const assignment = await FeeInvoiceV1.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('net_amount')), 'total_assigned'],
        [sequelize.fn('SUM', sequelize.col('concession_amount')), 'total_discount'],
        [sequelize.fn('SUM', sequelize.col('balance_amount')), 'total_due']
      ],
      where: invoiceWhere,
      raw: true
    });

    const paymentWhere = { is_cancelled: false };
    if (academic_year) {
      const invoiceIds = await getInvoiceIdsForAcademicYear(academic_year);
      if (!invoiceIds.length) {
        return res.status(200).json({
          success: true,
          statusCode: 200,
          message: 'Fee assignment vs collection data fetched successfully',
          data: {
            total_fee_assigned: 0,
            total_collected: 0,
            total_fine_collected: 0,
            total_discount: 0,
            total_due: 0
          }
        });
      }
      paymentWhere.invoice_id = { [Op.in]: invoiceIds };
    }

    const collection = await FeePaymentV1.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'total_collected'],
        [sequelize.fn('SUM', sequelize.col('fine_paid')), 'total_fine']
      ],
      where: paymentWhere,
      raw: true
    });

    const totalAssigned = parseFloat(assignment?.total_assigned) || 0;
    const totalCollected = parseFloat(collection?.total_collected) || 0;
    const totalFine = parseFloat(collection?.total_fine) || 0;
    const totalDiscount = parseFloat(assignment?.total_discount) || 0;
    const totalDue = parseFloat(assignment?.total_due) || Math.max(0, totalAssigned - totalCollected);

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
 * Returns payment method wise breakdown from fee_v1 payments
 */
const getPaymentModeCollection = async (req, res) => {
  try {
    const { academic_year, year } = req.query;

    // Build where condition
    const whereCondition = {
      is_cancelled: false
    };

    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      whereCondition.paid_at = {
        [Op.between]: [startDate, endDate]
      };
    }

    if (academic_year) {
      const invoiceIds = await getInvoiceIdsForAcademicYear(academic_year);
      if (!invoiceIds.length) {
        return res.status(200).json({
          success: true,
          statusCode: 200,
          message: 'Payment mode wise collection data fetched successfully',
          data: {
            payment_modes: [],
            summary: {
              total_transactions: 0,
              grand_total: 0
            }
          }
        });
      }
      whereCondition.invoice_id = { [Op.in]: invoiceIds };
    }

    // Get payment method wise data
    const paymentData = await FeePaymentV1.findAll({
      attributes: [
        'payment_mode',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
        [sequelize.literal('SUM(amount_paid + fine_paid)'), 'total_amount']
      ],
      where: whereCondition,
      group: ['payment_mode'],
      raw: true
    });

    // Format the response
    const paymentModes = paymentData.map(mode => ({
      payment_mode: mode.payment_mode,
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