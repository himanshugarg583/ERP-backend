const { IncomeExpense, User } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');

// Create income or expense entry
const createIncomeExpense = async (req, res) => {
  try {
    const {
      entry_type,
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date,
      recorded_by
    } = req.body;

    // Validation
    if (!entry_type || !category || !amount || !payment_mode || !entry_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Entry type, category, amount, payment mode, and entry date are required"
      });
    }

    // Validate entry_type
    if (!['income', 'expense'].includes(entry_type)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Entry type must be 'income' or 'expense'"
      });
    }

    // Validate payment_mode
    if (!['cash', 'online', 'cheque', 'bank_transfer'].includes(payment_mode)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Payment mode must be 'cash', 'online', 'cheque', or 'bank_transfer'"
      });
    }

    // Validate amount
    const entryAmount = parseFloat(amount);
    if (entryAmount <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Amount must be greater than 0"
      });
    }

    // Create income/expense entry
    const incomeExpense = await IncomeExpense.create({
      entry_type,
      category,
      sub_category: sub_category || null,
      amount: entryAmount,
      payment_mode,
      transaction_ref: transaction_ref || null,
      description: description || null,
      entry_date,
      recorded_by: recorded_by || req.user?.name || null
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: `${entry_type.charAt(0).toUpperCase() + entry_type.slice(1)} entry created successfully`,
      data: incomeExpense
    });

  } catch (error) {
    console.error("Create Income/Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all income/expense entries with filters
const getAllIncomeExpense = async (req, res) => {
  try {
    const {
      entry_type,
      category,
      sub_category,
      payment_mode,
      from_date,
      to_date,
      from_amount,
      to_amount,
      sort_by = 'entry_date',
      sort_order = 'DESC'
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (entry_type) whereConditions.entry_type = entry_type;
    if (category) whereConditions.category = { [Op.like]: `%${category}%` };
    if (sub_category) whereConditions.sub_category = { [Op.like]: `%${sub_category}%` };
    if (payment_mode) whereConditions.payment_mode = payment_mode;

    // Date range filter
    if (from_date && to_date) {
      whereConditions.entry_date = {
        [Op.between]: [from_date, to_date]
      };
    } else if (from_date) {
      whereConditions.entry_date = {
        [Op.gte]: from_date
      };
    } else if (to_date) {
      whereConditions.entry_date = {
        [Op.lte]: to_date
      };
    }

    // Amount range filter
    if (from_amount && to_amount) {
      whereConditions.amount = {
        [Op.between]: [parseFloat(from_amount), parseFloat(to_amount)]
      };
    } else if (from_amount) {
      whereConditions.amount = {
        [Op.gte]: parseFloat(from_amount)
      };
    } else if (to_amount) {
      whereConditions.amount = {
        [Op.lte]: parseFloat(to_amount)
      };
    }

    // Validate sort fields
    const allowedSortFields = ['entry_date', 'amount', 'category', 'entry_type', 'created_at'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'entry_date';
    const sortDirection = ['ASC', 'DESC'].includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const incomeExpenseEntries = await IncomeExpense.findAll({
      attributes: [
        'id', 'entry_type', 'category', 'sub_category', 'amount', 'payment_mode',
        'transaction_ref', 'description', 'entry_date', 'recorded_by', 'created_at'
      ],
      where: whereConditions,
      order: [[sortField, sortDirection]]
    });

    // Calculate summary statistics
    const allEntries = await IncomeExpense.findAll({
      attributes: [
        'entry_type', 
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['entry_type'],
      raw: true
    });

    const summary = {
      total_income: 0,
      total_expense: 0,
      income_count: 0,
      expense_count: 0,
      net_balance: 0
    };

    allEntries.forEach(entry => {
      if (entry.entry_type === 'income') {
        summary.total_income = parseFloat(entry.total_amount);
        summary.income_count = parseInt(entry.count);
      } else if (entry.entry_type === 'expense') {
        summary.total_expense = parseFloat(entry.total_amount);
        summary.expense_count = parseInt(entry.count);
      }
    });

    summary.net_balance = summary.total_income - summary.total_expense;

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income/Expense entries fetched successfully",
      data: {
        entries: incomeExpenseEntries,
       
      }
    });

  } catch (error) {
    console.error("Get All Income/Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single income/expense entry
const getSingleIncomeExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid entry ID is required"
      });
    }

    const incomeExpense = await IncomeExpense.findByPk(id, {
      attributes: [
        'id', 'entry_type', 'category', 'sub_category', 'amount', 'payment_mode',
        'transaction_ref', 'description', 'entry_date', 'recorded_by', 'created_at'
      ]
    });

    if (!incomeExpense) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Income/Expense entry not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income/Expense entry fetched successfully",
      data: incomeExpense
    });

  } catch (error) {
    console.error("Get Single Income/Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update income/expense entry
const updateIncomeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      entry_type,
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date,
      recorded_by
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid entry ID is required"
      });
    }

    const incomeExpense = await IncomeExpense.findByPk(id);

    if (!incomeExpense) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Income/Expense entry not found"
      });
    }

    // Build update object
    const updateData = {};

    if (entry_type !== undefined) {
      if (!['income', 'expense'].includes(entry_type)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Entry type must be 'income' or 'expense'"
        });
      }
      updateData.entry_type = entry_type;
    }

    if (category !== undefined) updateData.category = category;
    if (sub_category !== undefined) updateData.sub_category = sub_category;

    if (amount !== undefined) {
      const entryAmount = parseFloat(amount);
      if (entryAmount <= 0) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Amount must be greater than 0"
        });
      }
      updateData.amount = entryAmount;
    }

    if (payment_mode !== undefined) {
      if (!['cash', 'online', 'cheque', 'bank_transfer'].includes(payment_mode)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Payment mode must be 'cash', 'online', 'cheque', or 'bank_transfer'"
        });
      }
      updateData.payment_mode = payment_mode;
    }

    if (transaction_ref !== undefined) updateData.transaction_ref = transaction_ref;
    if (description !== undefined) updateData.description = description;
    if (entry_date !== undefined) updateData.entry_date = entry_date;
    if (recorded_by !== undefined) updateData.recorded_by = recorded_by;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update"
      });
    }

    await incomeExpense.update(updateData);

    // Fetch updated entry
    const updatedEntry = await IncomeExpense.findByPk(id, {
      attributes: [
        'id', 'entry_type', 'category', 'sub_category', 'amount', 'payment_mode',
        'transaction_ref', 'description', 'entry_date', 'recorded_by', 'created_at'
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income/Expense entry updated successfully",
      data: {
        entry: updatedEntry,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Income/Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete income/expense entry
const deleteIncomeExpense = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid entry ID is required"
      });
    }

    const incomeExpense = await IncomeExpense.findByPk(id, {
      attributes: ['id', 'entry_type', 'category', 'amount', 'entry_date']
    });

    if (!incomeExpense) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Income/Expense entry not found"
      });
    }

    const deletedData = {
      id: incomeExpense.id,
      entry_type: incomeExpense.entry_type,
      category: incomeExpense.category,
      amount: incomeExpense.amount,
      entry_date: incomeExpense.entry_date
    };

    await incomeExpense.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income/Expense entry deleted successfully",
      data: {
        deleted_entry: deletedData
      }
    });

  } catch (error) {
    console.error("Delete Income/Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get financial summary/report
const getFinancialSummary = async (req, res) => {
  try {
    const {
      from_date,
      to_date,
      group_by = 'month' // month, week, day, year
    } = req.query;

    // Build date filter
    const whereConditions = {};
    if (from_date && to_date) {
      whereConditions.entry_date = {
        [Op.between]: [from_date, to_date]
      };
    }

    // Get overall summary
    const overallSummary = await IncomeExpense.findAll({
      attributes: [
        'entry_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('amount')), 'avg_amount']
      ],
      where: whereConditions,
      group: ['entry_type'],
      raw: true
    });

    // Get category-wise breakdown
    const categoryBreakdown = await IncomeExpense.findAll({
      attributes: [
        'entry_type',
        'category',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['entry_type', 'category'],
      order: [['entry_type', 'ASC'], [sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      raw: true
    });

    // Get payment mode breakdown
    const paymentModeBreakdown = await IncomeExpense.findAll({
      attributes: [
        'payment_mode',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: ['payment_mode'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      raw: true
    });

    // Format time-based grouping query
    let dateFormat;
    switch (group_by) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const timeBasedSummary = await IncomeExpense.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), dateFormat), 'period'],
        'entry_type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: whereConditions,
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('entry_date'), dateFormat), 'entry_type'],
      order: [['period', 'ASC']],
      raw: true
    });

    // Process data for response
    const summary = {
      total_income: 0,
      total_expense: 0,
      net_balance: 0,
      income_count: 0,
      expense_count: 0,
      avg_income: 0,
      avg_expense: 0
    };

    overallSummary.forEach(entry => {
      if (entry.entry_type === 'income') {
        summary.total_income = parseFloat(entry.total_amount);
        summary.income_count = parseInt(entry.count);
        summary.avg_income = parseFloat(entry.avg_amount);
      } else if (entry.entry_type === 'expense') {
        summary.total_expense = parseFloat(entry.total_amount);
        summary.expense_count = parseInt(entry.count);
        summary.avg_expense = parseFloat(entry.avg_amount);
      }
    });

    summary.net_balance = summary.total_income - summary.total_expense;

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Financial summary fetched successfully",
      data: {
        summary,
        category_breakdown: categoryBreakdown,
        payment_mode_breakdown: paymentModeBreakdown,
        time_based_summary: timeBasedSummary,
        filters: {
          from_date,
          to_date,
          group_by
        }
      }
    });

  } catch (error) {
    console.error("Get Financial Summary Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createIncomeExpense,
  getAllIncomeExpense,
  getSingleIncomeExpense,
  updateIncomeExpense,
  deleteIncomeExpense,
  getFinancialSummary
};