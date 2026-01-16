const { FeeStructure } = require('../../models/admin/fees/FeeStructure');
const { StudentFee } = require('../../models/admin/fees/StudentFee');
const { FeeInstallment } = require('../../models/admin/fees/FeeInstallment');
const { FeePayment } = require('../../models/admin/fees/FeePayment');
const { Student } = require('../../models/admin/Student');
const { ClassSection } = require('../../models/admin/Classsection');
const { User } = require('../../models/admin/user');
const { IncomeExpense } = require('../../models/admin/fees/IncomeExpense');
const sequelize = require('../../config/db');
const { Op } = require('sequelize');

/**
 * Assign Fee Structure to all students in a class
 * @route POST /api/accountant/assign-fee
 */
const assignFeeToClass = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      class_section_id,
      fee_structure_id,
      installments, // Array of { installment_number, amount, due_date }
      apply_discount,
      discount_amount,
      discount_reason
    } = req.body;

    // Validation
    if (!class_section_id || !fee_structure_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Class and fee structure are required"
      });
    }

    // Check if class section exists
    const classSection = await ClassSection.findByPk(class_section_id);
    if (!classSection) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Class section not found"
      });
    }

    // Check if fee structure exists
    const feeStructure = await FeeStructure.findByPk(fee_structure_id);
    if (!feeStructure) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Fee structure not found"
      });
    }

    // Use academic year from fee structure
    const academic_year = `${feeStructure.academic_start_year}-${feeStructure.academic_end_year}`;

    // Get all students in the class
    const students = await Student.findAll({
      where: {
        class_section_id: class_section_id
      }
    });

    if (students.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No students found in this class"
      });
    }

    // Validate installments if provided
    if (installments && installments.length > 0) {
      const totalInstallmentAmount = installments.reduce((sum, inst) => sum + parseFloat(inst.amount), 0);
      const expectedAmount = parseFloat(feeStructure.total_amount) - (apply_discount ? parseFloat(discount_amount || 0) : 0);
      
      if (Math.abs(totalInstallmentAmount - expectedAmount) > 0.01) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: "Total installment amount must equal the fee structure total amount (minus discount if applicable)"
        });
      }
    }

    const assignedFees = [];
    const failedAssignments = [];

    // Assign fee to each student
    for (const student of students) {
      try {
        // Check if fee already assigned to this student for this academic year
        const existingFee = await StudentFee.findOne({
          where: {
            student_id: student.id,
            fee_structure_id: fee_structure_id,
            academic_year: academic_year
          }
        });

        if (existingFee) {
          failedAssignments.push({
            student_id: student.id,
            reason: 'Fee already assigned for this academic year'
          });
          continue;
        }

        const originalAmount = parseFloat(feeStructure.total_amount);
        const discountAmt = apply_discount ? parseFloat(discount_amount || 0) : 0;
        const finalAmount = originalAmount - discountAmt;

        // Create student fee record
        const studentFee = await StudentFee.create({
          student_id: student.id,
          fee_structure_id: fee_structure_id,
          academic_year: academic_year,
          original_amount: originalAmount,
          discount_amount: discountAmt,
          discount_reason: apply_discount ? discount_reason : null,
          final_amount: finalAmount,
          paid_amount: 0,
          due_amount: finalAmount,
          status: 'pending'
        }, { transaction });

        // Create installments if provided
        if (installments && installments.length > 0) {
          for (const installment of installments) {
            await FeeInstallment.create({
              student_fee_id: studentFee.id,
              installment_number: installment.installment_number,
              amount: installment.amount,
              due_date: installment.due_date,
              paid_amount: 0,
              late_fee_applied: 0,
              late_fee: 0,
              status: 'pending'
            }, { transaction });
          }
        } else {
          // If no installments provided, create a single installment
          await FeeInstallment.create({
            student_fee_id: studentFee.id,
            installment_number: 1,
            amount: finalAmount,
            due_date: feeStructure.due_date,
            paid_amount: 0,
            late_fee_applied: 0,
            late_fee: 0,
            status: 'pending'
          }, { transaction });
        }

        assignedFees.push({
          student_id: student.id,
          student_fee_id: studentFee.id
        });

      } catch (error) {
        failedAssignments.push({
          student_id: student.id,
          reason: error.message
        });
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: `Fee assigned to ${assignedFees.length} students successfully`,
      data: {
        total_students: students.length,
        assigned_count: assignedFees.length,
        failed_count: failedAssignments.length,
        assigned_fees: assignedFees,
        failed_assignments: failedAssignments
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error assigning fee:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error assigning fee to students",
      error: error.message
    });
  }
};

/**
 * Get all classes with student count for fee assignment
 * @route GET /api/accountant/classes-for-fee-assignment
 */
const getClassesForFeeAssignment = async (req, res) => {
  try {
    const classes = await ClassSection.findAll({
      attributes: [
        'id',
        'class_name',
        'section',
        [sequelize.fn('COUNT', sequelize.col('Students.id')), 'student_count']
      ],
      include: [
        {
          model: Student,
          attributes: [],
          required: false
        }
      ],
      group: ['ClassSection.id'],
      raw: true
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Classes fetched successfully",
      data: classes
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching classes",
      error: error.message
    });
  }
};

/**
 * Get assigned fees for a class
 * @route GET /api/accountant/assigned-fees/:class_section_id
 */
const getAssignedFeesByClass = async (req, res) => {
  try {
    const { class_section_id } = req.params;
    const { academic_year } = req.query;

    const whereClause = {};
    if (academic_year) {
      whereClause.academic_year = academic_year;
    }

    const assignedFees = await StudentFee.findAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          where: { class_section_id: class_section_id },
          attributes: ['id', 'roll_number'],
          include: [
            {
              model: User,
              attributes: ['name', 'email']
            }
          ]
        },
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'total_amount']
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: ['id', 'installment_number', 'amount', 'due_date', 'paid_amount', 'status']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Assigned fees fetched successfully",
      data: assignedFees
    });

  } catch (error) {
    console.error('Error fetching assigned fees:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching assigned fees",
      error: error.message
    });
  }
};

/**
 * Get complete fee details for a specific student
 * @route GET /api/accountant/student-fee-details/:student_id
 */
const getStudentFeeDetails = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { academic_year } = req.query;

    // Check if student exists
    const student = await Student.findByPk(student_id, {
      attributes: ['id', 'roll_number', 'dob', 'gender', 'address', 'admission_date', 'phone_no'],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'status']
        },
        {
          model: ClassSection,
          attributes: ['id', 'class_name', 'section_name']
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where clause for fees
    const feeWhereClause = { student_id: student_id };
    if (academic_year) {
      feeWhereClause.academic_year = academic_year;
    }

    // Get all fee records for the student
    const studentFees = await StudentFee.findAll({
      where: feeWhereClause,
      attributes: ['id', 'student_id', 'fee_structure_id', 'academic_year', 'original_amount', 'discount_amount', 'discount_reason', 'final_amount'],
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'academic_start_year', 'academic_end_year', 'total_amount', 'due_date', 'late_fee_amount', 'late_fee_type']
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: ['id', 'installment_number', 'amount', 'due_date', 'paid_amount', 'payment_date', 'late_fee_applied', 'late_fee', 'status'],
          order: [['installment_number', 'ASC']]
        }
      ],
      order: [['academic_year', 'DESC']]
    });

    // Calculate summary statistics from installments only
    let totalOriginalAmount = 0;
    let totalDiscountAmount = 0;
    let totalFinalAmount = 0;

    studentFees.forEach(fee => {
      totalOriginalAmount += parseFloat(fee.original_amount || 0);
      totalDiscountAmount += parseFloat(fee.discount_amount || 0);
      totalFinalAmount += parseFloat(fee.final_amount || 0);
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee details fetched successfully",
      data: {
        student_info: student,
        fee_summary: {
          total_original_amount: totalOriginalAmount.toFixed(2),
          total_discount_amount: totalDiscountAmount.toFixed(2),
          total_final_amount: totalFinalAmount.toFixed(2),
          total_fees_assigned: studentFees.length
        },
        fee_details: studentFees
      }
    });

  } catch (error) {
    console.error('Error fetching student fee details:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching student fee details",
      error: error.message
    });
  }
};

/**
 * Get all fee payments with filters
 * @route GET /api/accountant/fee-payments
 */
const getAllFeePayments = async (req, res) => {
  try {
    const { 
      student_id, 
      academic_year, 
      payment_method, 
      payment_status,
      from_date,
      to_date
    } = req.query;

    const whereClause = {};
    
    if (student_id) whereClause.student_id = student_id;
    if (academic_year) whereClause.academic_year = academic_year;
    if (payment_method) whereClause.payment_method = payment_method;
    if (payment_status) whereClause.payment_status = payment_status;
    
    if (from_date && to_date) {
      whereClause.payment_date = { [Op.between]: [from_date, to_date] };
    } else if (from_date) {
      whereClause.payment_date = { [Op.gte]: from_date };
    } else if (to_date) {
      whereClause.payment_date = { [Op.lte]: to_date };
    }

    const payments = await FeePayment.findAll({
      where: whereClause,
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
      ],
      order: [['payment_date', 'DESC']]
    });

    // Calculate totals
    let totalAmountPaid = 0;
    let totalLateFee = 0;
    let totalPaid = 0;

    payments.forEach(payment => {
      totalAmountPaid += parseFloat(payment.amount_paid || 0);
      totalLateFee += parseFloat(payment.late_fee_paid || 0);
      totalPaid += parseFloat(payment.total_paid || 0);
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Fee payments fetched successfully",
      data: {
        total_records: payments.length,
        payments,
        summary: {
          total_amount_paid: totalAmountPaid.toFixed(2),
          total_late_fee_paid: totalLateFee.toFixed(2),
          total_paid: totalPaid.toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching fee payments:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching fee payments",
      error: error.message
    });
  }
};

/**
 * Get payment details by receipt number
 * @route GET /api/accountant/fee-payment/:receipt_number
 */
const getFeePaymentByReceipt = async (req, res) => {
  try {
    const { receipt_number } = req.params;

    const payment = await FeePayment.findOne({
      where: { receipt_number },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'roll_number', 'dob', 'phone_no'],
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

    if (!payment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Payment not found with this receipt number"
      });
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payment details fetched successfully",
      data: payment
    });

  } catch (error) {
    console.error('Error fetching payment details:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching payment details",
      error: error.message
    });
  }
};

/**
 * Fill student fee payment (for accountant to record fee payment)
 * @route POST /api/accountant/fill-fee-payment
 */
const fillFeePayment = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      student_id,
      amount_paid,
      late_fee_paid = 0,
      payment_method,
      transaction_id,
      cheque_number,
      bank_name,
      remarks,
      installment_ids = [] // Array of installment IDs to apply payment to
    } = req.body;

    // Validation
    if (!student_id || !amount_paid || !payment_method) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Student ID, amount paid, and payment method are required"
      });
    }

    // Validate payment amount
    if (amount_paid <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Amount paid must be greater than 0"
      });
    }

    // Check if student exists
    const student = await Student.findByPk(student_id, {
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        }
      ]
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get student fee record (latest one if academic_year not provided)
    const studentFee = await StudentFee.findOne({
      where: {
        student_id: student_id
      },
      order: [['created_at', 'DESC']],
      transaction
    });

    if (!studentFee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee assigned to this student"
      });
    }

    // Calculate total paid amount
    const totalPaid = parseFloat(amount_paid) + parseFloat(late_fee_paid);

    // Generate unique receipt number
    const timestamp = Date.now();
    const receiptNumber = `RCP-${student_id}-${timestamp}`;

    // Create fee payment record
    const feePayment = await FeePayment.create({
      student_id: student_id,
      academic_year: studentFee.academic_year,
      payment_date: new Date(),
      amount_paid: amount_paid,
      late_fee_paid: late_fee_paid,
      total_paid: totalPaid,
      payment_method: payment_method,
      transaction_id: transaction_id || null,
      cheque_number: cheque_number || null,
      bank_name: bank_name || null,
      receipt_number: receiptNumber,
      payment_type: 'fee',
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
      // Update specific installments - NO validation, just update by IDs
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

      await installment.update({
        paid_amount: newPaidAmount,
        late_fee_applied: newLateFeeApplied,
        payment_date: new Date(),
        status: newPaidAmount >= parseFloat(installment.amount) ? 'paid' : 'pending'
      }, { transaction });

      updatedInstallments.push({
        installment_id: installment.id,
        installment_number: installment.installment_number,
        amount_paid: paymentForInstallment,
        late_fee_paid: lateFeeForInstallment,
        new_status: newPaidAmount >= parseFloat(installment.amount) ? 'paid' : 'pending'
      });
    }

    // Skip StudentFee table update - only update installments

    // Create income entry in IncomeExpense table
    await IncomeExpense.create({
      entry_type: 'income',
      category: 'Fee Collection',
      sub_category: 'Student Fee Payment',
      amount: totalPaid,
      payment_mode: payment_method,
      transaction_ref: transaction_id || receiptNumber,
      description: `Fee payment from ${student.User.name} (Roll No: ${student.roll_number}) - Receipt: ${receiptNumber}`,
      entry_date: new Date(),
      recorded_by: req.user ? req.user.name : 'Accountant'
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Fee payment recorded successfully",
      data: {
        payment: feePayment,
        updated_installments: updatedInstallments,
        receipt_number: receiptNumber
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error recording fee payment:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error recording fee payment",
      error: error.message
    });
  }
};

/**
 * Get student installments by student ID
 * @route GET /api/accountant/student-installments/:student_id
 */
const getStudentInstallments = async (req, res) => {
  try {
    const { student_id } = req.params;
    const { academic_year } = req.query;

    // Check if student exists
    const student = await Student.findByPk(student_id, {
      include: [
        {
          model: User,
          attributes: ['name', 'email']
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Build where clause
    const whereClause = { student_id: student_id };
    if (academic_year) {
      whereClause.academic_year = academic_year;
    }

    // Get student fees with installments (only pending/overdue installments)
    const studentFees = await StudentFee.findAll({
      where: whereClause,
      include: [
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: ['id', 'installment_number', 'amount', 'due_date', 'paid_amount', 'late_fee', 'late_fee_applied', 'status'],
          where: {
            status: { [Op.in]: ['pending', 'overdue'] }
          },
          required: false
        },
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'late_fee_amount', 'late_fee_type', 'due_date']
        }
      ],
      order: [
        ['academic_year', 'DESC'],
        [{ model: FeeInstallment, as: 'installments' }, 'installment_number', 'ASC']
      ]
    });

    if (!studentFees || studentFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee records found for this student"
      });
    }

    // Format installments data
    const currentDate = new Date();
    const installmentsData = [];
    
    studentFees.forEach(fee => {
      if (fee.installments && fee.installments.length > 0) {
        fee.installments.forEach(inst => {
          const dueDate = new Date(inst.due_date);
          const isOverdue = currentDate > dueDate;
          const dueAmount = parseFloat(inst.amount) - parseFloat(inst.paid_amount);
          
          // Calculate late fee if overdue
          let calculatedLateFee = 0;
          if (isOverdue && dueAmount > 0) {
            const feeStructure = fee.feeStructure;
            if (feeStructure && feeStructure.late_fee_amount) {
              if (feeStructure.late_fee_type === 'percentage') {
                calculatedLateFee = (dueAmount * parseFloat(feeStructure.late_fee_amount)) / 100;
              } else {
                calculatedLateFee = parseFloat(feeStructure.late_fee_amount);
              }
            }
          }

          installmentsData.push({
            installment_id: inst.id,
            student_fee_id: fee.id,
            installment_name: `${fee.feeStructure?.name || 'Fee'} - Installment ${inst.installment_number}`,
            installment_number: inst.installment_number,
            academic_year: fee.academic_year,
            amount: inst.amount,
            paid_amount: inst.paid_amount,
            due_amount: dueAmount,
            due_date: inst.due_date,
            is_overdue: isOverdue,
            late_fee: inst.late_fee,
            late_fee_applied: inst.late_fee_applied,
            calculated_late_fee: calculatedLateFee.toFixed(2),
            status: inst.status,
            fee_structure: {
              name: fee.feeStructure?.name || 'N/A',
              late_fee_amount: fee.feeStructure?.late_fee_amount || 0,
              late_fee_type: fee.feeStructure?.late_fee_type || 'flat',
              due_date: fee.feeStructure?.due_date
            }
          });
        });
      }
    });

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student installments fetched successfully",
      data: {
        student_info: {
          id: student.id,
          name: student.User.name,
          email: student.User.email
        },
        total_installments: installmentsData.length,
        installments: installmentsData
      }
    });

  } catch (error) {
    console.error('Error fetching student installments:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error fetching student installments",
      error: error.message
    });
  }
};

module.exports = {
  assignFeeToClass,
  getClassesForFeeAssignment,
  getAssignedFeesByClass,
  getStudentFeeDetails,
  getAllFeePayments,
  getFeePaymentByReceipt,
  fillFeePayment,
  getStudentInstallments
};
