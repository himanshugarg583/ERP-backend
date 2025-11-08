const { IncomeExpense, User } = require('../../../models');
const { Op } = require('sequelize');

// Create income entry
const createIncome = async (req, res) => {
  try {
    const {
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
    if (!category || !amount || !payment_mode || !entry_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Category, amount, payment mode, and entry date are required"
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

    // Create income entry
    const income = await IncomeExpense.create({
      entry_type: 'income',
      category,
      sub_category: sub_category || null,
      amount: entryAmount,
      payment_mode,
      transaction_ref: transaction_ref || null,
      description: description || null,
      entry_date,
      recorded_by: recorded_by || null
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Income entry created successfully",
      data: income
    });

  } catch (error) {
    console.error("Create Income Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all income entries
const getAllIncome = async (req, res) => {
  try {
    const {
      category,
      payment_mode,
      from_date,
      to_date,
      min_amount,
      max_amount
    } = req.query;

    // Build where clause
    const whereClause = { entry_type: 'income' };

    if (category) {
      whereClause.category = category;
    }

    if (payment_mode) {
      whereClause.payment_mode = payment_mode;
    }

    // Date range filter
    if (from_date && to_date) {
      whereClause.entry_date = {
        [Op.between]: [from_date, to_date]
      };
    } else if (from_date) {
      whereClause.entry_date = {
        [Op.gte]: from_date
      };
    } else if (to_date) {
      whereClause.entry_date = {
        [Op.lte]: to_date
      };
    }

    // Amount range filter
    if (min_amount && max_amount) {
      whereClause.amount = {
        [Op.between]: [parseFloat(min_amount), parseFloat(max_amount)]
      };
    } else if (min_amount) {
      whereClause.amount = {
        [Op.gte]: parseFloat(min_amount)
      };
    } else if (max_amount) {
      whereClause.amount = {
        [Op.lte]: parseFloat(max_amount)
      };
    }

    const incomes = await IncomeExpense.findAll({
      where: whereClause,
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      attributes: [
        'id',
        'entry_type',
        'category',
        'sub_category',
        'amount',
        'payment_mode',
        'transaction_ref',
        'description',
        'entry_date',
        'recorded_by',
        'created_at'
      ]
    });

    // Calculate total income
    const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income entries retrieved successfully",
      data: {
        total_records: incomes.length,
        total_income: totalIncome.toFixed(2),
        incomes: incomes
      }
    });

  } catch (error) {
    console.error("Get All Income Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single income entry
const getSingleIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await IncomeExpense.findOne({
      where: {
        id: id,
        entry_type: 'income'
      }
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Income entry not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income entry retrieved successfully",
      data: income
    });

  } catch (error) {
    console.error("Get Single Income Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update income entry
const updateIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category,
      sub_category,
      amount,
      payment_mode,
      transaction_ref,
      description,
      entry_date,
      recorded_by
    } = req.body;

    const income = await IncomeExpense.findOne({
      where: {
        id: id,
        entry_type: 'income'
      }
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Income entry not found"
      });
    }

    // Update fields
    const updateData = {};
    if (category) updateData.category = category;
    if (sub_category !== undefined) updateData.sub_category = sub_category;
    if (amount) {
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
    if (payment_mode) {
      if (!['cash', 'online', 'cheque', 'bank_transfer'].includes(payment_mode)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Invalid payment mode"
        });
      }
      updateData.payment_mode = payment_mode;
    }
    if (transaction_ref !== undefined) updateData.transaction_ref = transaction_ref;
    if (description !== undefined) updateData.description = description;
    if (entry_date) updateData.entry_date = entry_date;
    if (recorded_by !== undefined) updateData.recorded_by = recorded_by;

    await income.update(updateData);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income entry updated successfully",
      data: income
    });

  } catch (error) {
    console.error("Update Income Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete income entry
const deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const income = await IncomeExpense.findOne({
      where: {
        id: id,
        entry_type: 'income'
      }
    });

    if (!income) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Income entry not found"
      });
    }

    await income.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income entry deleted successfully"
    });

  } catch (error) {
    console.error("Delete Income Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createIncome,
  getAllIncome,
  getSingleIncome,
  updateIncome,
  deleteIncome
};
