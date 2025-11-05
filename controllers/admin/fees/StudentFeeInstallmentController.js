const { FeeInstallment, StudentFee, Student, User, FeeStructure, ClassSection } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');

// Create installments for a student fee
const createInstallmentsForStudentFee = async (req, res) => {
  try {
    const {
      student_fee_id,
      installments_data // Array of installment objects: [{installment_number, amount, due_date}, ...]
    } = req.body;

    // Validation
    if (!student_fee_id || !installments_data || !Array.isArray(installments_data)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student Fee ID and installments data array are required"
      });
    }

    if (installments_data.length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "At least one installment is required"
      });
    }

    // Validate student fee exists
    const studentFee = await StudentFee.findByPk(student_fee_id, {
      attributes: ['id', 'student_id', 'final_amount', 'status'],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id'],
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student fee assignment not found"
      });
    }

    // Check if installments already exist for this student fee
    const existingInstallments = await FeeInstallment.findAll({
      attributes: ['id'],
      where: { student_fee_id }
    });

    if (existingInstallments.length > 0) {
      return res.status(409).json({
        success: false,
        statusCode: 409,
        message: "Installments already exist for this student fee"
      });
    }

    // Validate installments data
    let totalInstallmentAmount = 0;
    const validatedInstallments = [];

    for (let i = 0; i < installments_data.length; i++) {
      const installment = installments_data[i];
      
      if (!installment.installment_number || !installment.amount || !installment.due_date) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Installment ${i + 1}: installment_number, amount, and due_date are required`
        });
      }

      const amount = parseFloat(installment.amount);
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `Installment ${i + 1}: amount must be greater than 0`
        });
      }

      totalInstallmentAmount += amount;

      validatedInstallments.push({
        student_fee_id,
        installment_number: installment.installment_number,
        amount: amount,
        due_date: installment.due_date,
        paid_amount: 0,
        status: 'pending'
      });
    }

    // Check if total installment amount matches student fee final amount
    const finalAmount = parseFloat(studentFee.final_amount);
    if (Math.abs(totalInstallmentAmount - finalAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Total installment amount (${totalInstallmentAmount}) must equal student fee final amount (${finalAmount})`
      });
    }

    // Create installments
    const createdInstallments = await FeeInstallment.bulkCreate(validatedInstallments);

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Installments created successfully",
      data: {
        student_fee_id,
        total_installments: createdInstallments.length,
        total_amount: totalInstallmentAmount,
        installments: createdInstallments
      }
    });

  } catch (error) {
    console.error("Create Installments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get all installments for a student fee
const getInstallmentsByStudentFeeId = async (req, res) => {
  try {
    const { student_fee_id } = req.params;

    if (!student_fee_id || isNaN(parseInt(student_fee_id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid student fee ID is required"
      });
    }

    const installments = await FeeInstallment.findAll({
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'payment_date', 'late_fee_applied', 'late_fee', 
        'status', 'created_at', 'updated_at'
      ],
      where: { student_fee_id },
      include: [
        {
          model: StudentFee,
          as: 'studentFee',
          attributes: ['id', 'student_id', 'fee_structure_id', 'academic_year', 'final_amount'],
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'user_id'],
              include: [{
                model: User,
                attributes: ['id', 'name', 'email']
              }]
            },
            {
              model: FeeStructure,
              as: 'feeStructure',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['installment_number', 'ASC']]
    });

    if (installments.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No installments found for this student fee"
      });
    }

    // Calculate summary
    const summary = {
      total_installments: installments.length,
      total_amount: installments.reduce((sum, inst) => sum + parseFloat(inst.amount), 0),
      total_paid: installments.reduce((sum, inst) => sum + parseFloat(inst.paid_amount), 0),
      pending_count: installments.filter(inst => inst.status === 'pending').length,
      paid_count: installments.filter(inst => inst.status === 'paid').length,
      overdue_count: installments.filter(inst => inst.status === 'overdue').length
    };

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Installments fetched successfully",
      data: {
        installments,
        summary
      }
    });

  } catch (error) {
    console.error("Get Installments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get single installment
const getSingleInstallment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid installment ID is required"
      });
    }

    const installment = await FeeInstallment.findByPk(id, {
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'payment_date', 'late_fee_applied', 'late_fee', 
        'status', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: StudentFee,
          as: 'studentFee',
          attributes: ['id', 'student_id', 'fee_structure_id', 'academic_year', 'final_amount'],
          include: [
            {
              model: Student,
              as: 'student',
              attributes: ['id', 'user_id'],
              include: [{
                model: User,
                attributes: ['id', 'name', 'email']
              }]
            },
            {
              model: FeeStructure,
              as: 'feeStructure',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });

    if (!installment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Installment not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Installment fetched successfully",
      data: installment
    });

  } catch (error) {
    console.error("Get Single Installment Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Mark installment as paid
const markInstallmentAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      paid_amount, 
      payment_date = new Date(),
      late_fee_applied = 0
    } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid installment ID is required"
      });
    }

    if (!paid_amount || parseFloat(paid_amount) <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid paid amount is required"
      });
    }

    const installment = await FeeInstallment.findByPk(id, {
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'payment_date', 'late_fee_applied', 'status'
      ]
    });

    if (!installment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Installment not found"
      });
    }

    if (installment.status === 'paid') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Installment is already marked as paid"
      });
    }

    const paidAmt = parseFloat(paid_amount);
    const installmentAmount = parseFloat(installment.amount);
    const lateFee = parseFloat(late_fee_applied) || 0;
    const totalDue = installmentAmount + lateFee;

    if (paidAmt > totalDue) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: `Paid amount (${paidAmt}) cannot exceed total due amount (${totalDue})`
      });
    }

    // Calculate late fee if payment is after due date
    let calculatedLateFee = 0;
    const currentDate = new Date();
    const dueDate = new Date(installment.due_date);
    
    if (currentDate > dueDate && lateFee === 0) {
      // You can implement your late fee calculation logic here
      // For now, setting a flat rate of 50 for overdue payments
      calculatedLateFee = 50;
    }

    // Update installment
    const updateData = {
      paid_amount: paidAmt,
      payment_date: payment_date,
      late_fee_applied: lateFee || calculatedLateFee,
      status: paidAmt >= (installmentAmount + (lateFee || calculatedLateFee)) ? 'paid' : 'pending'
    };

    await installment.update(updateData);

    // Update student fee paid amount
    const studentFee = await StudentFee.findByPk(installment.student_fee_id, {
      attributes: ['id', 'paid_amount', 'final_amount', 'due_amount']
    });

    if (studentFee) {
      const newPaidAmount = parseFloat(studentFee.paid_amount) + paidAmt;
      const newDueAmount = parseFloat(studentFee.final_amount) - newPaidAmount;
      
      await studentFee.update({
        paid_amount: newPaidAmount,
        due_amount: Math.max(0, newDueAmount),
        status: newDueAmount <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending'
      });
    }

    // Fetch updated installment with relations
    const updatedInstallment = await FeeInstallment.findByPk(id, {
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'payment_date', 'late_fee_applied', 'late_fee', 
        'status', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: StudentFee,
          as: 'studentFee',
          attributes: ['id', 'student_id', 'final_amount', 'paid_amount', 'due_amount', 'status']
        }
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Installment payment recorded successfully",
      data: updatedInstallment
    });

  } catch (error) {
    console.error("Mark Installment Paid Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Update installment
const updateInstallment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, due_date, status } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid installment ID is required"
      });
    }

    const installment = await FeeInstallment.findByPk(id, {
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'status'
      ]
    });

    if (!installment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Installment not found"
      });
    }

    // Build update object
    const updateData = {};

    if (amount !== undefined) {
      const newAmount = parseFloat(amount);
      if (newAmount <= 0) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Amount must be greater than 0"
        });
      }
      updateData.amount = newAmount;
    }

    if (due_date !== undefined) updateData.due_date = due_date;
    
    if (status !== undefined) {
      if (!['pending', 'paid', 'overdue', 'waived'].includes(status)) {
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Status must be 'pending', 'paid', 'overdue', or 'waived'"
        });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "No valid fields provided for update"
      });
    }

    await installment.update(updateData);

    // Fetch updated installment
    const updatedInstallment = await FeeInstallment.findByPk(id, {
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'payment_date', 'late_fee_applied', 'late_fee', 
        'status', 'created_at', 'updated_at'
      ]
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Installment updated successfully",
      data: {
        installment: updatedInstallment,
        updated_fields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error("Update Installment Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Delete installment
const deleteInstallment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid installment ID is required"
      });
    }

    const installment = await FeeInstallment.findByPk(id, {
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 
        'paid_amount', 'status'
      ]
    });

    if (!installment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Installment not found"
      });
    }

    // Check if installment has been paid
    if (parseFloat(installment.paid_amount) > 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Cannot delete installment with payments. Please refund payments first."
      });
    }

    const deletedData = {
      id: installment.id,
      student_fee_id: installment.student_fee_id,
      installment_number: installment.installment_number,
      amount: installment.amount
    };

    await installment.destroy();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Installment deleted successfully",
      data: {
        deleted_installment: deletedData
      }
    });

  } catch (error) {
    console.error("Delete Installment Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get overdue installments
const getOverdueInstallments = async (req, res) => {
  try {
    const { 
      days_overdue = 0,
      class_section_id,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - parseInt(days_overdue));

    const whereConditions = {
      due_date: { [Op.lt]: overdueDate },
      status: { [Op.in]: ['pending', 'overdue'] },
      paid_amount: { [Op.lt]: sequelize.col('amount') }
    };

    const includeConditions = [
      {
        model: StudentFee,
        as: 'studentFee',
        attributes: ['id', 'student_id', 'fee_structure_id', 'academic_year'],
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['id', 'user_id', 'class_section_id'],
            include: [
              {
                model: User,
                attributes: ['id', 'name', 'email']
              },
              {
                model: ClassSection,
                attributes: ['id', 'class_name', 'section_name']
              }
            ]
          }
        ]
      }
    ];

    // Add class section filter if provided
    if (class_section_id) {
      includeConditions[0].include[0].where = { class_section_id };
    }

    const overdueInstallments = await FeeInstallment.findAndCountAll({
      attributes: [
        'id', 'student_fee_id', 'installment_number', 'amount', 'due_date',
        'paid_amount', 'late_fee_applied', 'status', 'created_at'
      ],
      where: whereConditions,
      include: includeConditions,
      order: [['due_date', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Overdue installments fetched successfully",
      data: {
        overdue_installments: overdueInstallments.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(overdueInstallments.count / parseInt(limit)),
          total_records: overdueInstallments.count,
          per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get Overdue Installments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

module.exports = {
  createInstallmentsForStudentFee,
  getInstallmentsByStudentFeeId,
  getSingleInstallment,
  markInstallmentAsPaid,
  updateInstallment,
  deleteInstallment,
  getOverdueInstallments
};