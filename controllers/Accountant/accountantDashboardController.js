const { FeePayment } = require('../../models/admin/fees/FeePayment');
const { StudentFee } = require('../../models/admin/fees/StudentFee');
const { FeeInstallment } = require('../../models/admin/fees/FeeInstallment');
const { IncomeExpense } = require('../../models/admin/fees/IncomeExpense');
const { Student } = require('../../models/admin/Student');
const { ClassSection } = require('../../models/admin/Classsection');
const { User } = require('../../models/admin/user');
const sequelize = require('../../config/db');
const { Op } = require('sequelize');

/**
 * Get Accountant Dashboard Stats
 * @route GET /api/accountant/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

    // Total fee collection - Today
    const todayCollection = await FeePayment.sum('total_paid', {
      where: {
        payment_date: { [Op.between]: [startOfToday, endOfToday] },
        payment_status: 'success'
      }
    }) || 0;

    // Total fee collection - This Month
    const monthCollection = await FeePayment.sum('total_paid', {
      where: {
        payment_date: { [Op.between]: [startOfMonth, endOfMonth] },
        payment_status: 'success'
      }
    }) || 0;

    // Total fee collection - This Year
    const yearCollection = await FeePayment.sum('total_paid', {
      where: {
        payment_date: { [Op.between]: [startOfYear, endOfYear] },
        payment_status: 'success'
      }
    }) || 0;

    // Total students with assigned fees
    const totalStudentsWithFees = await StudentFee.count({
      distinct: true,
      col: 'student_id'
    });

    // Total pending amount from installments
    const pendingInstallments = await FeeInstallment.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.literal('amount - paid_amount')), 'pending_amount']
      ],
      where: {
        status: { [Op.in]: ['pending', 'overdue'] }
      },
      raw: true
    });
    const totalPending = parseFloat(pendingInstallments[0]?.pending_amount || 0);

    // Overdue fees count
    const overdueCount = await FeeInstallment.count({
      where: {
        status: 'overdue',
        due_date: { [Op.lt]: new Date() }
      }
    });

    // Total income this month
    const monthlyIncome = await IncomeExpense.sum('amount', {
      where: {
        entry_type: 'income',
        entry_date: { [Op.between]: [startOfMonth, endOfMonth] }
      }
    }) || 0;

    // Total expense this month
    const monthlyExpense = await IncomeExpense.sum('amount', {
      where: {
        entry_type: 'expense',
        entry_date: { [Op.between]: [startOfMonth, endOfMonth] }
      }
    }) || 0;

    // Total payments count today
    const todayPaymentsCount = await FeePayment.count({
      where: {
        payment_date: { [Op.between]: [startOfToday, endOfToday] },
        payment_status: 'success'
      }
    });

    // Total payments count this month
    const monthPaymentsCount = await FeePayment.count({
      where: {
        payment_date: { [Op.between]: [startOfMonth, endOfMonth] },
        payment_status: 'success'
      }
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Dashboard stats fetched successfully",
      data: {
        fee_collection: {
          today: parseFloat(todayCollection).toFixed(2),
          this_month: parseFloat(monthCollection).toFixed(2),
          this_year: parseFloat(yearCollection).toFixed(2)
        },
        students: {
          total_with_fees: totalStudentsWithFees
        },
        pending_fees: {
          total_amount: totalPending.toFixed(2),
          overdue_count: overdueCount
        },
        income_expense: {
          monthly_income: parseFloat(monthlyIncome).toFixed(2),
          monthly_expense: parseFloat(monthlyExpense).toFixed(2),
          monthly_net: (parseFloat(monthlyIncome) - parseFloat(monthlyExpense)).toFixed(2)
        },
        payments_count: {
          today: todayPaymentsCount,
          this_month: monthPaymentsCount
        }
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching dashboard stats",
      error: error.message
    });
  }
};

/**
 * Get Monthly Fee Collection Chart Data
 * @route GET /api/accountant/dashboard/monthly-collection
 */
const getMonthlyCollectionChart = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const monthlyData = await FeePayment.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('payment_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('total_paid')), 'total_collection']
      ],
      where: {
        payment_status: 'success',
        payment_date: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31, 23, 59, 59, 999)
          ]
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('payment_date'))],
      order: [[sequelize.fn('MONTH', sequelize.col('payment_date')), 'ASC']],
      raw: true
    });

    // Fill in missing months with 0
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthNames.map((name, index) => {
      const monthData = monthlyData.find(d => d.month === index + 1);
      return {
        month: name,
        amount: monthData ? parseFloat(monthData.total_collection).toFixed(2) : '0.00'
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Monthly collection data fetched successfully",
      data: {
        year: currentYear,
        chart_data: chartData
      }
    });

  } catch (error) {
    console.error('Error fetching monthly collection:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching monthly collection data",
      error: error.message
    });
  }
};

/**
 * Get Payment Method Breakdown
 * @route GET /api/accountant/dashboard/payment-methods
 */
const getPaymentMethodBreakdown = async (req, res) => {
  try {
    const { period } = req.query; // 'today', 'month', 'year'
    
    let dateFilter = {};
    const today = new Date();
    
    if (period === 'today') {
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      const endOfToday = new Date(today.setHours(23, 59, 59, 999));
      dateFilter = { payment_date: { [Op.between]: [startOfToday, endOfToday] } };
    } else if (period === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = { payment_date: { [Op.between]: [startOfMonth, endOfMonth] } };
    } else if (period === 'year') {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      dateFilter = { payment_date: { [Op.between]: [startOfYear, endOfYear] } };
    }

    const paymentMethods = await FeePayment.findAll({
      attributes: [
        'payment_method',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_paid')), 'total_amount']
      ],
      where: {
        payment_status: 'success',
        ...dateFilter
      },
      group: ['payment_method'],
      raw: true
    });

    const formattedData = paymentMethods.map(method => ({
      method: method.payment_method,
      count: parseInt(method.count),
      amount: parseFloat(method.total_amount).toFixed(2)
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payment method breakdown fetched successfully",
      data: {
        period: period || 'all',
        payment_methods: formattedData
      }
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching payment method breakdown",
      error: error.message
    });
  }
};

/**
 * Get Recent Payments
 * @route GET /api/accountant/dashboard/recent-payments
 */
const getRecentPayments = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentPayments = await FeePayment.findAll({
      limit: parseInt(limit),
      order: [['payment_date', 'DESC']],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['name', 'email']
            },
            {
              model: ClassSection,
              attributes: ['class_name', 'section_name']
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Recent payments fetched successfully",
      data: {
        payments: recentPayments
      }
    });

  } catch (error) {
    console.error('Error fetching recent payments:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching recent payments",
      error: error.message
    });
  }
};

/**
 * Get Class-wise Fee Collection
 * @route GET /api/accountant/dashboard/class-wise-collection
 */
const getClassWiseCollection = async (req, res) => {
  try {
    const classWiseData = await StudentFee.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('final_amount')), 'total_assigned'],
        [sequelize.fn('COUNT', sequelize.col('StudentFee.id')), 'student_count']
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: [],
          include: [
            {
              model: ClassSection,
              attributes: ['id', 'class_name', 'section_name']
            }
          ]
        }
      ],
      group: ['student.ClassSection.id'],
      raw: false
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Class-wise collection fetched successfully",
      data: {
        class_data: classWiseData
      }
    });

  } catch (error) {
    console.error('Error fetching class-wise data:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching class-wise collection",
      error: error.message
    });
  }
};

/**
 * Get Income vs Expense Chart
 * @route GET /api/accountant/dashboard/income-expense-chart
 */
const getIncomeExpenseChart = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const monthlyData = await IncomeExpense.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('entry_date')), 'month'],
        'entry_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      where: {
        entry_date: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31)
          ]
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('entry_date')), 'entry_type'],
      order: [[sequelize.fn('MONTH', sequelize.col('entry_date')), 'ASC']],
      raw: true
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthNames.map((name, index) => {
      const incomeData = monthlyData.find(d => d.month === index + 1 && d.entry_type === 'income');
      const expenseData = monthlyData.find(d => d.month === index + 1 && d.entry_type === 'expense');
      
      return {
        month: name,
        income: incomeData ? parseFloat(incomeData.total).toFixed(2) : '0.00',
        expense: expenseData ? parseFloat(expenseData.total).toFixed(2) : '0.00'
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income vs Expense chart data fetched successfully",
      data: {
        year: currentYear,
        chart_data: chartData
      }
    });

  } catch (error) {
    console.error('Error fetching income-expense data:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching income vs expense data",
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getMonthlyCollectionChart,
  getPaymentMethodBreakdown,
  getRecentPayments,
  getClassWiseCollection,
  getIncomeExpenseChart
};
