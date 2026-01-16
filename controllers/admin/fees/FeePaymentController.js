const { FeePayment, Student, User, ClassSection, StudentFee, FeeInstallment, IncomeExpense } = require('../../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../../models');

/**
 * Get All Fee Payments
 * For displaying payments in table format
 */
const getAllFeePayments = async (req, res) => {
  try {
    const {
      student_id,
      academic_year,
      payment_method,
      payment_status,
      payment_type,
      from_date,
      to_date
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (student_id) whereConditions.student_id = student_id;
    if (academic_year) whereConditions.academic_year = academic_year;
    if (payment_method) whereConditions.payment_method = payment_method;
    if (payment_status) whereConditions.payment_status = payment_status;
    if (payment_type) whereConditions.payment_type = payment_type;

    // Date range filter
    if (from_date || to_date) {
      whereConditions.payment_date = {};
      if (from_date) whereConditions.payment_date[Op.gte] = new Date(from_date);
      if (to_date) whereConditions.payment_date[Op.lte] = new Date(to_date);
    }

    // Fetch payments
    const payments = await FeePayment.findAll({
      where: whereConditions,
      attributes: [
        'id', 'student_id', 'academic_year', 'payment_date', 
        'amount_paid', 'late_fee_paid', 'total_paid', 
        'payment_method', 'transaction_id', 'receipt_number',
        'payment_type', 'payment_for', 'payment_status',
        'is_refund', 'cheque_number', 'bank_name', 'remarks',
        'refund_reason', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id', 'class_section_id', 'roll_number'],
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
      ],
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    // Calculate summary statistics
    const totalAmount = payments.reduce((sum, payment) => 
      sum + parseFloat(payment.total_paid), 0
    );

    const successfulPayments = payments.filter(p => p.payment_status === 'success');
    const totalSuccessfulAmount = successfulPayments.reduce((sum, payment) => 
      sum + parseFloat(payment.total_paid), 0
    );

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee payments fetched successfully",
      data: {
        payments: payments,
        summary: {
          total_payments: payments.length,
          total_amount: parseFloat(totalAmount.toFixed(2)),
          successful_payments: successfulPayments.length,
          total_successful_amount: parseFloat(totalSuccessfulAmount.toFixed(2))
        }
      }
    });

  } catch (error) {
    console.error("Get All Fee Payments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * Get Single Payment Details
 * For displaying complete payment information when clicked
 */
const getSinglePaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Valid payment ID is required"
      });
    }

    // Fetch payment with full details
    const payment = await FeePayment.findByPk(id, {
      attributes: [
        'id', 'student_id', 'academic_year', 'payment_date',
        'amount_paid', 'late_fee_paid', 'total_paid',
        'payment_method', 'transaction_id', 'cheque_number',
        'bank_name', 'receipt_number', 'payment_type',
        'payment_for', 'remarks', 'payment_status',
        'is_refund', 'refund_reason', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id', 'class_section_id', 'roll_number'],
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
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Payment record not found"
      });
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payment details fetched successfully",
      data: payment
    });

  } catch (error) {
    console.error("Get Single Payment Details Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

/**
 * Create Fee Payment
 * Records a new fee payment and updates installments
 */
const createFeePayment = async (req, res) => {
  try {
    const {
      student_id,
      amount_paid,
      late_fee_paid = 0,
      payment_method,
      transaction_id,
      cheque_number,
      bank_name,
      payment_for,
      remarks,
      payment_date,
      installment_ids = [] // Array of installment IDs to apply payment to
    } = req.body;

    // Validation
    if (!student_id || !amount_paid || !payment_method) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student ID, Amount Paid, and Payment Method are required"
      });
    }

    if (amount_paid <= 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Amount paid must be greater than 0"
      });
    }

    // Verify student exists
    const student = await Student.findByPk(student_id, {
      attributes: ['id', 'user_id'],
      include: [{
        model: User,
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get student fee record (latest one if not provided)
    const studentFee = await StudentFee.findOne({
      where: { student_id },
      order: [['created_at', 'DESC']]
    });

    if (!studentFee) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee assigned to this student"
      });
    }

    // Calculate total paid amount
    const total_paid = parseFloat(amount_paid) + parseFloat(late_fee_paid || 0);

    // Generate receipt number
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    const receipt_number = `RCP-${year}${month}-${timestamp}`;

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Create payment record
      const feePayment = await FeePayment.create({
        student_id,
        academic_year: studentFee.academic_year,
        payment_date: payment_date || new Date(),
        amount_paid: parseFloat(amount_paid),
        late_fee_paid: parseFloat(late_fee_paid || 0),
        total_paid,
        payment_method,
        transaction_id: transaction_id || null,
        cheque_number: cheque_number || null,
        bank_name: bank_name || null,
        receipt_number,
        payment_type: 'fee',
        payment_for: payment_for || 'Fee Payment',
        remarks: remarks || null,
        payment_status: 'success',
        is_refund: false
      }, { transaction });

      // Update installments
      let remainingAmount = parseFloat(amount_paid);
      let remainingLateFee = parseFloat(late_fee_paid);
      const updatedInstallments = [];

      // Get installments to update
      let installmentsToUpdate;
      if (installment_ids && installment_ids.length > 0) {
        // Update specific installments by IDs
        installmentsToUpdate = await FeeInstallment.findAll({
          where: {
            id: { [Op.in]: installment_ids }
          },
          order: [['installment_number', 'ASC']],
          transaction
        });
      } else {
        // Update pending installments in order
        installmentsToUpdate = await FeeInstallment.findAll({
          where: {
            student_fee_id: studentFee.id,
            status: { [Op.in]: ['pending', 'overdue'] }
          },
          order: [['installment_number', 'ASC']],
          transaction
        });
      }

      for (const installment of installmentsToUpdate) {
        if (remainingAmount <= 0 && remainingLateFee <= 0) break;

        const installmentDue = parseFloat(installment.amount) - parseFloat(installment.paid_amount);
        const lateFeeApplicable = parseFloat(installment.late_fee) - parseFloat(installment.late_fee_applied);

        let paymentForInstallment = 0;
        let lateFeeForInstallment = 0;

        // Apply late fee first if any
        if (remainingLateFee > 0 && lateFeeApplicable > 0) {
          lateFeeForInstallment = Math.min(remainingLateFee, lateFeeApplicable);
          remainingLateFee -= lateFeeForInstallment;
        }

        // Apply payment to installment
        if (remainingAmount > 0 && installmentDue > 0) {
          paymentForInstallment = Math.min(remainingAmount, installmentDue);
          remainingAmount -= paymentForInstallment;
        }

        // Update installment
        const newPaidAmount = parseFloat(installment.paid_amount) + paymentForInstallment;
        const newLateFeeApplied = parseFloat(installment.late_fee_applied) + lateFeeForInstallment;

        // Determine installment status
        let installmentStatus = 'pending';
        const totalInstallmentAmount = parseFloat(installment.amount);
        if (newPaidAmount >= totalInstallmentAmount) {
          installmentStatus = 'paid';
        } else if (newPaidAmount > 0) {
          installmentStatus = 'partial';
        }

        await installment.update({
          paid_amount: newPaidAmount,
          late_fee_applied: newLateFeeApplied,
          payment_date: newPaidAmount >= totalInstallmentAmount ? (payment_date || new Date()) : installment.payment_date,
          status: installmentStatus
        }, { transaction });

        updatedInstallments.push({
          installment_id: installment.id,
          installment_number: installment.installment_number,
          amount_applied: paymentForInstallment,
          late_fee_applied: lateFeeForInstallment,
          new_paid_amount: newPaidAmount,
          status: installmentStatus
        });
      }

      // Create entry in IncomeExpense table
      await IncomeExpense.create({
        entry_type: 'income',
        category: 'Fee',
        sub_category: payment_for || 'Fee Payment',
        amount: total_paid,
        payment_mode: payment_method,
        transaction_ref: transaction_id || receipt_number,
        description: `Fee payment from ${student.User?.name} (Student ID: ${student_id}) - Receipt: ${receipt_number}`,
        entry_date: payment_date || new Date(),
        recorded_by: 'Admin'
      }, { transaction });

      await transaction.commit();

      // Fetch created payment with student details
      const createdPayment = await FeePayment.findByPk(feePayment.id, {
        attributes: [
          'id', 'student_id', 'academic_year', 'payment_date',
          'amount_paid', 'late_fee_paid', 'total_paid',
          'payment_method', 'transaction_id', 'receipt_number',
          'payment_for', 'payment_status', 'created_at'
        ],
        include: [{
          model: Student,
          as: 'student',
          attributes: ['id', 'user_id'],
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        }]
      });

      res.status(201).json({
        success: true,
        statusCode: 201,
        message: "Fee payment recorded successfully",
        data: {
          payment: createdPayment,
          receipt_number: receipt_number,
          student_name: student.User?.name,
          installments_updated: updatedInstallments,
          remaining_amount: remainingAmount > 0 ? parseFloat(remainingAmount.toFixed(2)) : 0
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Create Fee Payment Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to record payment",
      error: error.message
    });
  }
};

module.exports = {
  getAllFeePayments,
  getSinglePaymentDetails,
  createFeePayment
};
