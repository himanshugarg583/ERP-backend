const { Op } = require('sequelize');
const sequelize = require('../../config/db');
const { FeePaymentV1, FeeInvoiceV1, StudentFeeAssignmentV1, FeeStructureV1 } = require('../../models');
const { IncomeExpense } = require('../../models/admin/accounting/IncomeExpense');
const { Student } = require('../../models/admin/Student');
const { ClassSection } = require('../../models/admin/Classsection');
const { User } = require('../../models/admin/user');

const getRange = (period) => {
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start, end };
  }

  return null;
};

const getInvoiceIdsForAcademicYear = async (academicYearId) => {
  if (!academicYearId) return null;
  const rows = await FeeInvoiceV1.findAll({
    include: [{
      model: StudentFeeAssignmentV1,
      as: 'assignment',
      required: true,
      attributes: [],
      include: [{
        model: FeeStructureV1,
        as: 'feeStructure',
        required: true,
        where: { academic_year_id: Number(academicYearId) },
        attributes: []
      }]
    }],
    attributes: ['id'],
    raw: true
  });
  return rows.map((row) => row.id);
};

const getPaymentTotal = async (where) => {
  const row = await FeePaymentV1.findOne({
    attributes: [[sequelize.literal('COALESCE(SUM(amount_paid + fine_paid), 0)'), 'total']],
    where,
    raw: true
  });

  return parseFloat(row?.total || 0);
};

/**
 * Get Accountant Dashboard Stats
 * @route GET /api/accountant/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
  try {
    const todayRange = getRange('today');
    const monthRange = getRange('month');
    const yearRange = getRange('year');

    const todayCollection = await getPaymentTotal({
      is_cancelled: false,
      paid_at: { [Op.between]: [todayRange.start, todayRange.end] }
    });

    const monthCollection = await getPaymentTotal({
      is_cancelled: false,
      paid_at: { [Op.between]: [monthRange.start, monthRange.end] }
    });

    const yearCollection = await getPaymentTotal({
      is_cancelled: false,
      paid_at: { [Op.between]: [yearRange.start, yearRange.end] }
    });

    const totalStudentsWithFees = await FeeInvoiceV1.count({
      distinct: true,
      col: 'student_id'
    });

    const totalPending = await FeeInvoiceV1.sum('balance_amount', {
      where: {
        balance_amount: { [Op.gt]: 0 },
        status: { [Op.in]: ['active', 'partial', 'overdue'] }
      }
    }) || 0;

    const overdueCount = await FeeInvoiceV1.count({
      where: {
        status: 'overdue',
        balance_amount: { [Op.gt]: 0 }
      }
    });

    const monthlyIncome = await IncomeExpense.sum('amount', {
      where: {
        entry_type: 'income',
        entry_date: { [Op.between]: [monthRange.start, monthRange.end] }
      }
    }) || 0;

    const monthlyExpense = await IncomeExpense.sum('amount', {
      where: {
        entry_type: 'expense',
        entry_date: { [Op.between]: [monthRange.start, monthRange.end] }
      }
    }) || 0;

    const todayPaymentsCount = await FeePaymentV1.count({
      where: {
        is_cancelled: false,
        paid_at: { [Op.between]: [todayRange.start, todayRange.end] }
      }
    });

    const monthPaymentsCount = await FeePaymentV1.count({
      where: {
        is_cancelled: false,
        paid_at: { [Op.between]: [monthRange.start, monthRange.end] }
      }
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Dashboard stats fetched successfully',
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
          total_amount: parseFloat(totalPending).toFixed(2),
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
      message: 'Error fetching dashboard stats',
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
    const currentYear = Number(year || new Date().getFullYear());

    const monthlyData = await FeePaymentV1.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('paid_at')), 'month'],
        [sequelize.literal('COALESCE(SUM(amount_paid + fine_paid), 0)'), 'total_collection']
      ],
      where: {
        is_cancelled: false,
        paid_at: {
          [Op.between]: [
            new Date(currentYear, 0, 1),
            new Date(currentYear, 11, 31, 23, 59, 59, 999)
          ]
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('paid_at'))],
      order: [[sequelize.fn('MONTH', sequelize.col('paid_at')), 'ASC']],
      raw: true
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = monthNames.map((name, index) => {
      const monthData = monthlyData.find((d) => Number(d.month) === index + 1);
      return {
        month: name,
        amount: monthData ? parseFloat(monthData.total_collection).toFixed(2) : '0.00'
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Monthly collection data fetched successfully',
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
      message: 'Error fetching monthly collection data',
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
    const { period } = req.query;
    const range = getRange(period);

    const where = { is_cancelled: false };
    if (range) {
      where.paid_at = { [Op.between]: [range.start, range.end] };
    }

    const paymentMethods = await FeePaymentV1.findAll({
      attributes: [
        'payment_mode',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.literal('COALESCE(SUM(amount_paid + fine_paid), 0)'), 'total_amount']
      ],
      where,
      group: ['payment_mode'],
      raw: true
    });

    const formattedData = paymentMethods.map((method) => ({
      method: method.payment_mode,
      count: parseInt(method.count, 10),
      amount: parseFloat(method.total_amount).toFixed(2)
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Payment method breakdown fetched successfully',
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
      message: 'Error fetching payment method breakdown',
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
    const parsedLimit = Number(req.query.limit || 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;

    const payments = await FeePaymentV1.findAll({
      where: { is_cancelled: false },
      attributes: [
        'id',
        'receipt_number',
        'invoice_id',
        'student_id',
        'amount_paid',
        'fine_paid',
        'payment_mode',
        'transaction_ref',
        'paid_at'
      ],
      order: [['paid_at', 'DESC']],
      limit,
      raw: true
    });

    const studentIds = [...new Set(payments.map((p) => p.student_id))];
    const invoiceIds = [...new Set(payments.map((p) => p.invoice_id))];

    const students = studentIds.length
      ? await Student.findAll({
          where: { id: { [Op.in]: studentIds } },
          attributes: ['id', 'user_id', 'class_section_id', 'roll_number'],
          raw: true
        })
      : [];

    const invoices = invoiceIds.length
      ? await FeeInvoiceV1.findAll({
          where: { id: { [Op.in]: invoiceIds } },
          attributes: ['id', 'invoice_number'],
          raw: true
        })
      : [];

    const userIds = [...new Set(students.map((s) => s.user_id).filter(Boolean))];
    const classIds = [...new Set(students.map((s) => s.class_section_id).filter(Boolean))];

    const users = userIds.length
      ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'name', 'email'], raw: true })
      : [];

    const classes = classIds.length
      ? await ClassSection.findAll({ where: { id: { [Op.in]: classIds } }, attributes: ['id', 'class_name', 'section_name'], raw: true })
      : [];

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const invoiceMap = new Map(invoices.map((i) => [i.id, i]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const classMap = new Map(classes.map((c) => [c.id, c]));

    const result = payments.map((payment) => {
      const student = studentMap.get(payment.student_id);
      const user = student ? userMap.get(student.user_id) : null;
      const classInfo = student ? classMap.get(student.class_section_id) : null;
      const invoice = invoiceMap.get(payment.invoice_id);

      return {
        payment_id: payment.id,
        receipt_number: payment.receipt_number,
        invoice_number: invoice?.invoice_number || null,
        payment_date: payment.paid_at,
        amount_paid: parseFloat(payment.amount_paid || 0),
        fine_paid: parseFloat(payment.fine_paid || 0),
        total_paid: parseFloat((Number(payment.amount_paid || 0) + Number(payment.fine_paid || 0)).toFixed(2)),
        payment_method: payment.payment_mode,
        transaction_ref: payment.transaction_ref,
        student: {
          id: student?.id || null,
          roll_number: student?.roll_number || null,
          name: user?.name || null,
          email: user?.email || null,
          class_name: classInfo?.class_name || null,
          section_name: classInfo?.section_name || null
        }
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Recent payments fetched successfully',
      data: {
        payments: result
      }
    });
  } catch (error) {
    console.error('Error fetching recent payments:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Error fetching recent payments',
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
    const students = await Student.findAll({
      where: { class_section_id: { [Op.ne]: null } },
      attributes: ['id', 'class_section_id'],
      raw: true
    });

    if (!students.length) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Class-wise collection fetched successfully',
        data: {
          class_data: []
        }
      });
    }

    const studentClassMap = new Map(students.map((s) => [s.id, s.class_section_id]));
    const studentIds = students.map((s) => s.id);

    const invoices = await FeeInvoiceV1.findAll({
      where: { student_id: { [Op.in]: studentIds } },
      attributes: ['student_id', 'net_amount', 'balance_amount'],
      raw: true
    });

    const payments = await FeePaymentV1.findAll({
      where: {
        student_id: { [Op.in]: studentIds },
        is_cancelled: false
      },
      attributes: ['student_id', 'amount_paid', 'fine_paid'],
      raw: true
    });

    const aggregate = new Map();

    for (const invoice of invoices) {
      const classId = studentClassMap.get(invoice.student_id);
      if (!classId) continue;

      if (!aggregate.has(classId)) {
        aggregate.set(classId, {
          class_id: classId,
          total_assigned: 0,
          total_collected: 0,
          total_due: 0,
          student_ids: new Set()
        });
      }

      const bucket = aggregate.get(classId);
      bucket.total_assigned += Number(invoice.net_amount || 0);
      bucket.total_due += Number(invoice.balance_amount || 0);
      bucket.student_ids.add(invoice.student_id);
    }

    for (const payment of payments) {
      const classId = studentClassMap.get(payment.student_id);
      if (!classId || !aggregate.has(classId)) continue;
      const bucket = aggregate.get(classId);
      bucket.total_collected += Number(payment.amount_paid || 0) + Number(payment.fine_paid || 0);
    }

    const classIds = [...aggregate.keys()];
    const classes = classIds.length
      ? await ClassSection.findAll({
          where: { id: { [Op.in]: classIds } },
          attributes: ['id', 'class_name', 'section_name'],
          raw: true
        })
      : [];

    const classMap = new Map(classes.map((c) => [c.id, c]));

    const classData = classIds.map((classId) => {
      const bucket = aggregate.get(classId);
      const classInfo = classMap.get(classId);

      return {
        class_id: classId,
        class_name: classInfo?.class_name || null,
        section_name: classInfo?.section_name || null,
        student_count: bucket.student_ids.size,
        total_assigned: Number(bucket.total_assigned.toFixed(2)),
        total_collected: Number(bucket.total_collected.toFixed(2)),
        total_due: Number(bucket.total_due.toFixed(2))
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Class-wise collection fetched successfully',
      data: {
        class_data: classData
      }
    });
  } catch (error) {
    console.error('Error fetching class-wise data:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Error fetching class-wise collection',
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
    const currentYear = Number(year || new Date().getFullYear());

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
      const incomeData = monthlyData.find((d) => Number(d.month) === index + 1 && d.entry_type === 'income');
      const expenseData = monthlyData.find((d) => Number(d.month) === index + 1 && d.entry_type === 'expense');

      return {
        month: name,
        income: incomeData ? parseFloat(incomeData.total).toFixed(2) : '0.00',
        expense: expenseData ? parseFloat(expenseData.total).toFixed(2) : '0.00'
      };
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Income vs Expense chart data fetched successfully',
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
      message: 'Error fetching income vs expense data',
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
