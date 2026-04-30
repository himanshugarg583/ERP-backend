const { AcademicYear, IncomeEntryV1, User } = require('../../../models');
const { Op } = require('sequelize');

const formatIncomeEntry = (entry) => {
  const data = entry.get({ plain: true });
  return {
    id: data.id,
    academic_year: data.academicYear ? data.academicYear.name : null,
    fee_payment_id: data.fee_payment_id || null,
    category: data.category,
    source: data.source || null,
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

// Create income entry
const createIncome = async (req, res) => {
  try {
    const {
      academic_year_id,
      fee_payment_id,
      category,
      source,
      amount,
      entry_date,
      notes
    } = req.body;

    // Validation
    if (!amount || !entry_date) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Amount and entry date are required"
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
    const income = await IncomeEntryV1.create({
      academic_year_id: academic_year_id || null,
      fee_payment_id: fee_payment_id || null,
      category: category || 'fee_collection',
      source: source || null,
      amount: entryAmount,
      entry_date,
      notes: notes || null,
      recorded_by: req.user?.id || null
    });

    const createdIncome = await IncomeEntryV1.findByPk(income.id, {
      attributes: [
        'id',
        'fee_payment_id',
        'category',
        'source',
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
      message: "Income entry created successfully",
      data: formatIncomeEntry(createdIncome)
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
      academic_year_id,
      fee_payment_id,
      category,
      source,
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

    if (source) {
      whereClause.source = source;
    }

    if (academic_year_id) {
      whereClause.academic_year_id = parseInt(academic_year_id, 10);
    }

    if (fee_payment_id) {
      whereClause.fee_payment_id = parseInt(fee_payment_id, 10);
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

    const incomes = await IncomeEntryV1.findAll({
      where: whereClause,
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
      attributes: [
        'id',
        'fee_payment_id',
        'category',
        'amount',
        'source',
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

    // Calculate total income
    const totalIncome = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income entries retrieved successfully",
      data: {
        total_records: incomes.length,
        total_income: totalIncome.toFixed(2),
        incomes: incomes.map(formatIncomeEntry)
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

    const income = await IncomeEntryV1.findByPk(id, {
      attributes: [
        'id',
        'fee_payment_id',
        'category',
        'source',
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
      data: formatIncomeEntry(income)
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
      academic_year_id,
      fee_payment_id,
      category,
      source,
      amount,
      entry_date,
      notes
    } = req.body;

    const income = await IncomeEntryV1.findByPk(id);

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
    if (academic_year_id !== undefined) updateData.academic_year_id = academic_year_id;
    if (fee_payment_id !== undefined) updateData.fee_payment_id = fee_payment_id;
    if (source !== undefined) updateData.source = source;
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
    if (notes !== undefined) updateData.notes = notes;
    if (entry_date) updateData.entry_date = entry_date;

    await income.update(updateData);

    const updatedIncome = await IncomeEntryV1.findByPk(id, {
      attributes: [
        'id',
        'fee_payment_id',
        'category',
        'source',
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
      message: "Income entry updated successfully",
      data: formatIncomeEntry(updatedIncome)
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

    const income = await IncomeEntryV1.findByPk(id);

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

// Income summary for dashboard cards
const getIncomeSummary = async (req, res) => {
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
      IncomeEntryV1.count(),
      IncomeEntryV1.sum('amount'),
      IncomeEntryV1.sum('amount', {
        where: { entry_date: { [Op.between]: [thisMonthStart, thisMonthEnd] } }
      }),
      IncomeEntryV1.sum('amount', {
        where: { entry_date: { [Op.between]: [lastMonthStart, lastMonthEnd] } }
      })
    ]);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Income summary fetched successfully",
      data: {
        total_count: totalCount,
        total_amount: (parseFloat(totalAmount) || 0).toFixed(2),
        this_month: (parseFloat(thisMonthAmount) || 0).toFixed(2),
        last_month: (parseFloat(lastMonthAmount) || 0).toFixed(2)
      }
    });
  } catch (error) {
    console.error("Get Income Summary Error:", error);
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
  deleteIncome,
  getIncomeSummary
};
