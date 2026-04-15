const { IncomeExpense } = require('../../models/admin/accounting/IncomeExpense');
const { Op } = require('sequelize');

/**
 * Add Income Entry
 * @route POST /accountant/income
 */
const addIncome = async (req, res) => {
  try {
    const {
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date
    } = req.body;

    // Validation
    if (!category || !amount || !payment_mode || !entry_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Category, amount, payment_mode, and entry_date are required"
      });
    }

    // Get recorded_by from token
    const recordedBy = req.user.name || req.user.email;

    // Create income entry
    const income = await IncomeExpense.create({
      entry_type: 'income',
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date,
      recorded_by: recordedBy
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Income entry added successfully",
      data: income
    });

  } catch (error) {
    console.error("Error adding income:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Add Expense Entry
 * @route POST /accountant/expense
 */
const addExpense = async (req, res) => {
  try {
    const {
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date
    } = req.body;

    // Validation
    if (!category || !amount || !payment_mode || !entry_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Category, amount, payment_mode, and entry_date are required"
      });
    }

    // Get recorded_by from token
    const recordedBy = req.user.name || req.user.email;

    // Create expense entry
    const expense = await IncomeExpense.create({
      entry_type: 'expense',
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date,
      recorded_by: recordedBy
    });

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Expense entry added successfully",
      data: expense
    });

  } catch (error) {
    console.error("Error adding expense:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Income vs Expense Graph Data
 * @route GET /accountant/income-expense-graph?month=12&year=2025
 */
const getIncomeExpenseGraph = async (req, res) => {
  try {
    const { month, year } = req.query;

    let whereCondition = {};

    // If year is provided
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      whereCondition.entry_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    // If month is also provided (month requires year)
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
      
      whereCondition.entry_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    // Get total income
    const incomeData = await IncomeExpense.findOne({
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      where: {
        ...whereCondition,
        entry_type: 'income'
      },
      raw: true
    });

    // Get total expense
    const expenseData = await IncomeExpense.findOne({
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'total']
      ],
      where: {
        ...whereCondition,
        entry_type: 'expense'
      },
      raw: true
    });

    const totalIncome = parseFloat(incomeData.total) || 0;
    const totalExpense = parseFloat(expenseData.total) || 0;
    const netProfit = totalIncome - totalExpense;

    let period = "All Time";
    if (month && year) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      period = `${monthNames[parseInt(month) - 1]} ${year}`;
    } else if (year) {
      period = `Year ${year}`;
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income vs Expense data fetched successfully",
      data: {
        period: period,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_profit: netProfit
      }
    });

  } catch (error) {
    console.error("Error fetching income expense graph:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get Monthly Expense Data
 * @route GET /accountant/monthly-expense?year=2025
 */
const getMonthlyExpense = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const { Sequelize } = require('sequelize');

    // Get monthly expense data
    const monthlyData = await IncomeExpense.findAll({
      attributes: [
        [Sequelize.fn('MONTH', Sequelize.col('entry_date')), 'month'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_expense']
      ],
      where: {
        entry_type: 'expense',
        entry_date: {
          [Op.between]: [`${currentYear}-01-01`, `${currentYear}-12-31`]
        }
      },
      group: [Sequelize.fn('MONTH', Sequelize.col('entry_date'))],
      order: [[Sequelize.fn('MONTH', Sequelize.col('entry_date')), 'ASC']],
      raw: true
    });

    // Month names
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    // Create array with all 12 months initialized to 0
    const expenseByMonth = monthNames.map((name, index) => ({
      month: name,
      month_number: index + 1,
      total_expense: 0
    }));

    // Fill in actual data
    monthlyData.forEach(record => {
      const monthIndex = parseInt(record.month) - 1;
      expenseByMonth[monthIndex].total_expense = parseFloat(record.total_expense) || 0;
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Monthly expense data fetched successfully",
      data: {
        year: currentYear,
        monthly_expenses: expenseByMonth
      }
    });

  } catch (error) {
    console.error("Error fetching monthly expense:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get All Income Entries
 * @route GET /accountant/income-list?month=12&year=2025
 */
const getIncomeList = async (req, res) => {
  try {
    const { month, year } = req.query;

    let whereCondition = { entry_type: 'income' };

    // Filter by year and month if provided
    if (year) {
      if (month) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
        whereCondition.entry_date = { [Op.between]: [startDate, endDate] };
      } else {
        whereCondition.entry_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
      }
    }

    const entries = await IncomeExpense.findAll({
      where: whereCondition,
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income entries fetched successfully",
      data: {
        total: entries.length,
        entries: entries
      }
    });

  } catch (error) {
    console.error("Error fetching income list:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Get All Expense Entries
 * @route GET /accountant/expense-list?month=12&year=2025
 */
const getExpenseList = async (req, res) => {
  try {
    const { month, year } = req.query;

    let whereCondition = { entry_type: 'expense' };

    // Filter by year and month if provided
    if (year) {
      if (month) {
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
        whereCondition.entry_date = { [Op.between]: [startDate, endDate] };
      } else {
        whereCondition.entry_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
      }
    }

    const entries = await IncomeExpense.findAll({
      where: whereCondition,
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Expense entries fetched successfully",
      data: {
        total: entries.length,
        entries: entries
      }
    });

  } catch (error) {
    console.error("Error fetching expense list:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Update Income/Expense Entry
 * @route PUT /accountant/income-expense/:id
 */
const updateIncomeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date
    } = req.body;

    const entry = await IncomeExpense.findByPk(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Entry not found"
      });
    }

    await entry.update({
      category: category || entry.category,
      sub_category: sub_category !== undefined ? sub_category : entry.sub_category,
      amount: amount || entry.amount,
      payment_mode: payment_mode || entry.payment_mode,
      transaction_ref: transaction_ref !== undefined ? transaction_ref : entry.transaction_ref,
      description: description !== undefined ? description : entry.description,
      entry_date: entry_date || entry.entry_date
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Entry updated successfully",
      data: entry
    });

  } catch (error) {
    console.error("Error updating entry:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

/**
 * Delete Income/Expense Entry
 * @route DELETE /accountant/income-expense/:id
 */
const deleteIncomeExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await IncomeExpense.findByPk(id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Entry not found"
      });
    }

    await entry.destroy();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Entry deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting entry:", error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  addIncome,
  addExpense,
  getIncomeExpenseGraph,
  getMonthlyExpense,
  getIncomeList,
  getExpenseList,
  updateIncomeExpense,
  deleteIncomeExpense
};
