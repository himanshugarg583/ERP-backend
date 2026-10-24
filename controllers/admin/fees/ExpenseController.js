const { AcademicYear, ExpenseEntryV1, User } = require('../../../models');
const { Op } = require('sequelize');

const formatExpenseEntry = (entry) => {
  const data = entry.get({ plain: true });
  return {
    id: data.id,
    academic_year: data.academicYear ? data.academicYear.name : null,
    category: data.category,
    vendor_name: data.vendor_name || null,
    payment_mode: data.payment_mode,
    amount: data.amount,
    entry_date: data.entry_date,
    notes: data.notes || null,
    recorded_by: data.recordedBy ? data.recordedBy.name : null,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

const toISODate = (date) => date.toISOString().slice(0, 10);

const getMonthRange = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
};

// Create expense entry
const createExpense = async (req, res) => {
  try {
    const {
      academic_year_id,
      category,
      vendor_name,
      payment_mode,
      amount,
      entry_date,
      notes
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
    if (!['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'].includes(payment_mode)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Payment mode must be 'cash', 'upi', 'card', 'bank_transfer', 'cheque', or 'other'"
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

    // Create expense entry
    const expense = await ExpenseEntryV1.create({
      academic_year_id: academic_year_id || null,
      category,
      vendor_name: vendor_name || null,
      payment_mode,
      amount: entryAmount,
      entry_date,
      notes: notes || null,
      recorded_by: req.user?.id || null
    });

    const createdExpense = await ExpenseEntryV1.findByPk(expense.id, {
      attributes: [
        'id',
        'category',
        'vendor_name',
        'payment_mode',
        'amount',
        'entry_date',
        'notes',
        'created_at',
        'updated_at'
      ],
      include: [
        { model: AcademicYear, as: 'academicYear', attributes: ['name'] },
        { model: User, as: 'recordedBy', attributes: ['name'] }
      ]
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Expense entry created successfully",
      data: formatExpenseEntry(createdExpense)
    });

  } catch (error) {
    console.error("Create Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all expense entries
const getAllExpense = async (req, res) => {
  try {
    const {
      academic_year_id,
      category,
      vendor_name,
      payment_mode,
      from_date,
      to_date,
      min_amount,
      max_amount
    } = req.query;

    // Build where clause
    const whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (payment_mode) {
      whereClause.payment_mode = payment_mode;
    }

    if (vendor_name) {
      whereClause.vendor_name = vendor_name;
    }

    if (academic_year_id) {
      whereClause.academic_year_id = parseInt(academic_year_id, 10);
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

    const expenses = await ExpenseEntryV1.findAll({
      where: whereClause,
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      attributes: [
        'id',
        'category',
        'vendor_name',
        'amount',
        'payment_mode',
        'entry_date',
        'notes',
        'created_at',
        'updated_at'
      ],
      include: [
        { model: AcademicYear, as: 'academicYear', attributes: ['name'] },
        { model: User, as: 'recordedBy', attributes: ['name'] }
      ]
    });

    // Calculate total expense
    const totalExpense = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Expense entries retrieved successfully",
      data: {
        total_records: expenses.length,
        total_expense: totalExpense.toFixed(2),
        expenses: expenses.map(formatExpenseEntry)
      }
    });

  } catch (error) {
    console.error("Get All Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single expense entry
const getSingleExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await ExpenseEntryV1.findByPk(id, {
      attributes: [
        'id',
        'category',
        'vendor_name',
        'payment_mode',
        'amount',
        'entry_date',
        'notes',
        'created_at',
        'updated_at'
      ],
      include: [
        { model: AcademicYear, as: 'academicYear', attributes: ['name'] },
        { model: User, as: 'recordedBy', attributes: ['name'] }
      ]
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Expense entry not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Expense entry retrieved successfully",
      data: formatExpenseEntry(expense)
    });

  } catch (error) {
    console.error("Get Single Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update expense entry
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      academic_year_id,
      category,
      vendor_name,
      amount,
      payment_mode,
      entry_date,
      notes
    } = req.body;

    const expense = await ExpenseEntryV1.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Expense entry not found"
      });
    }

    // Update fields
    const updateData = {};
    if (category) updateData.category = category;
    if (academic_year_id !== undefined) updateData.academic_year_id = academic_year_id;
    if (vendor_name !== undefined) updateData.vendor_name = vendor_name;
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
      if (!['cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other'].includes(payment_mode)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Invalid payment mode"
        });
      }
      updateData.payment_mode = payment_mode;
    }
    if (entry_date) updateData.entry_date = entry_date;
    if (notes !== undefined) updateData.notes = notes;

    await expense.update(updateData);

    const updatedExpense = await ExpenseEntryV1.findByPk(id, {
      attributes: [
        'id',
        'category',
        'vendor_name',
        'payment_mode',
        'amount',
        'entry_date',
        'notes',
        'created_at',
        'updated_at'
      ],
      include: [
        { model: AcademicYear, as: 'academicYear', attributes: ['name'] },
        { model: User, as: 'recordedBy', attributes: ['name'] }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Expense entry updated successfully",
      data: formatExpenseEntry(updatedExpense)
    });

  } catch (error) {
    console.error("Update Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete expense entry
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await ExpenseEntryV1.findByPk(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Expense entry not found"
      });
    }

    await expense.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Expense entry deleted successfully"
    });

  } catch (error) {
    console.error("Delete Expense Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Expense summary for dashboard cards
const getExpenseSummary = async (req, res) => {
  try {
    const now = new Date();
    const { start: thisMonthStart, end: thisMonthEnd } = getMonthRange(now);
    const { start: lastMonthStart, end: lastMonthEnd } = getMonthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const [
      totalCount,
      totalAmount,
      thisMonthAmount,
      lastMonthAmount
    ] = await Promise.all([
      ExpenseEntryV1.count(),
      ExpenseEntryV1.sum('amount'),
      ExpenseEntryV1.sum('amount', {
        where: { entry_date: { [Op.between]: [thisMonthStart, thisMonthEnd] } }
      }),
      ExpenseEntryV1.sum('amount', {
        where: { entry_date: { [Op.between]: [lastMonthStart, lastMonthEnd] } }
      })
    ]);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Expense summary fetched successfully",
      data: {
        total_count: totalCount,
        total_amount: (parseFloat(totalAmount) || 0).toFixed(2),
        this_month: (parseFloat(thisMonthAmount) || 0).toFixed(2),
        last_month: (parseFloat(lastMonthAmount) || 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error("Get Expense Summary Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createExpense,
  getAllExpense,
  getSingleExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};
