const { Student, StudentFee, FeeStructure, FeeInstallment, ClassSection, FeePayment, IncomeExpense, User } = require('../../../models');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Get student fee details (user_id from token)
const getStudentFeeDetails = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all student fees (only StudentFee table data + fee structure name)
    const studentFees = await StudentFee.findAll({
      where: { student_id: student.id },
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['name']
        }
      ],
      attributes: [
        'id',
        'student_id',
        'fee_structure_id',
        'academic_year',
        'original_amount',
        'discount_amount',
        'discount_reason',
        'final_amount',
        'created_at',
        'updated_at'
      ],
      order: [['created_at', 'DESC']]
    });

    if (studentFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee records found for this student"
      });
    }

    // Format response (only StudentFee table data + fee structure name)
    const formattedFees = studentFees.map(fee => ({
      id: fee.id,
      student_id: fee.student_id,
      fee_structure_id: fee.fee_structure_id,
      fee_structure_name: fee.feeStructure?.name || null,
      academic_year: fee.academic_year,
      original_amount: parseFloat(fee.original_amount),
      discount_amount: parseFloat(fee.discount_amount),
      discount_reason: fee.discount_reason,
      final_amount: parseFloat(fee.final_amount),
      created_at: fee.created_at,
      updated_at: fee.updated_at
    }));

    // Calculate total fees assigned to student
    const totalFeesAssigned = studentFees.reduce((sum, fee) => {
      return sum + parseFloat(fee.final_amount);
    }, 0);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student fee details fetched successfully",
      data: {
        student_id: student.id,
        user_id: user_id,
        total_fees_assigned: totalFeesAssigned.toFixed(2),
        total_fee_records: studentFees.length,
        fees: formattedFees
      }
    });

  } catch (error) {
    console.error("Get Student Fee Details Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student installments (user_id from token)
const getStudentInstallments = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all student fees to find their installments
    const studentFees = await StudentFee.findAll({
      where: { student_id: student.id },
      attributes: ['id', 'fee_structure_id', 'academic_year', 'final_amount'],
      include: [
        {
          model: FeeStructure,
          as: 'feeStructure',
          attributes: ['id', 'name', 'academic_start_year', 'academic_end_year', 'late_fee_amount', 'late_fee_type']
        },
        {
          model: FeeInstallment,
          as: 'installments',
          attributes: [
            'id',
            'installment_number',
            'amount',
            'due_date',
            'paid_amount',
            'payment_date',
            'late_fee_applied',
            'late_fee',
            'status',
            'created_at',
            'updated_at'
          ]
        }
      ]
    });

    if (studentFees.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "No fee records found for this student"
      });
    }

    // Current date for overdue check
    const currentDate = new Date();

    // Format response
    const formattedData = studentFees.map(fee => ({
      student_fee_id: fee.id,
      fee_structure_name: fee.feeStructure?.name,
      academic_year: `${fee.feeStructure?.academic_start_year}-${fee.feeStructure?.academic_end_year}`,
      installments: fee.installments?.map(inst => {
        const dueDate = new Date(inst.due_date);
        const isOverdue = currentDate > dueDate && inst.status !== 'paid';
        
        let calculatedLateFee = 0;
        if (isOverdue) {
          const remainingAmount = parseFloat(inst.amount) - parseFloat(inst.paid_amount);
          if (fee.feeStructure?.late_fee_type === 'percentage') {
            calculatedLateFee = (remainingAmount * parseFloat(fee.feeStructure.late_fee_amount)) / 100;
          } else {
            calculatedLateFee = parseFloat(fee.feeStructure?.late_fee_amount || 0);
          }
        }

        return {
          installment_id: inst.id,
          installment_number: inst.installment_number,
          amount: inst.amount,
          due_date: inst.due_date,
          paid_amount: inst.paid_amount,
          payment_date: inst.payment_date,
          remaining_amount: parseFloat(inst.amount) - parseFloat(inst.paid_amount),
          status: inst.status,
          is_overdue: isOverdue,
          calculated_late_fee: calculatedLateFee.toFixed(2),
          created_at: inst.created_at,
          updated_at: inst.updated_at
        };
      }) || []
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Student installments fetched successfully",
      data: {
        student_id: student.id,
        user_id: user_id,
        fee_records: formattedData
      }
    });

  } catch (error) {
    console.error("Get Student Installments Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error"
    });
  }
};

// Get student payment history (user_id from token)
const getStudentPaymentHistory = async (req, res) => {
  try {
    // Get user_id from auth token
    const user_id = req.user.id;

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id', 'roll_number']
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Student not found"
      });
    }

    // Get all payments made by this student
    const payments = await FeePayment.findAll({
      where: { student_id: student.id },
      attributes: [
        'id',
        'student_id',
        'academic_year',
        'payment_date',
        'amount_paid',
        'late_fee_paid',
        'total_paid',
        'payment_method',
        'transaction_id',
        'receipt_number',
        'payment_type',
        'payment_for',
        'remarks',
        'payment_status',
        'is_refund',
        'refund_reason',
        'created_at'
      ],
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']]
    });

    if (payments.length === 0) {
      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "No payment history found",
        data: {
          student_id: student.id,
          user_id: user_id,
          roll_number: student.roll_number,
          total_payments: 0,
          total_amount_paid: 0,
          payments: []
        }
      });
    }

    // Calculate total amount paid
    const totalAmountPaid = payments.reduce((sum, payment) => {
      if (payment.payment_status === 'success' && !payment.is_refund) {
        return sum + parseFloat(payment.total_paid);
      }
      return sum;
    }, 0);

    // Calculate statistics
    const successfulPayments = payments.filter(p => p.payment_status === 'success' && !p.is_refund);
    const refundPayments = payments.filter(p => p.is_refund);
    const pendingPayments = payments.filter(p => p.payment_status === 'pending');

    // Format payment data
    const formattedPayments = payments.map(payment => ({
      payment_id: payment.id,
      receipt_number: payment.receipt_number,
      academic_year: payment.academic_year,
      payment_date: payment.payment_date,
      payment_for: payment.payment_for,
      amount_paid: parseFloat(payment.amount_paid),
      late_fee_paid: parseFloat(payment.late_fee_paid),
      total_paid: parseFloat(payment.total_paid),
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_status: payment.payment_status,
      is_refund: payment.is_refund,
      refund_reason: payment.refund_reason,
      remarks: payment.remarks,
      created_at: payment.created_at
    }));

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payment history fetched successfully",
      data: {
        student_id: student.id,
        user_id: user_id,
        roll_number: student.roll_number,
        summary: {
          total_payments: payments.length,
          successful_payments: successfulPayments.length,
          pending_payments: pendingPayments.length,
          refund_payments: refundPayments.length,
          total_amount_paid: parseFloat(totalAmountPaid.toFixed(2))
        },
        payments: formattedPayments
      }
    });

  } catch (error) {
    console.error("Get Student Payment History Error:", error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

// Create Razorpay order for installment payment
const createInstallmentPaymentOrder = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { installment_id } = req.body;

    // Validation
    if (!installment_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Installment ID is required"
      });
    }

    // Find student by user_id
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id', 'roll_number'],
      include: [
        {
          model: User,
          attributes: ['name']
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

    // Get installment details
    const installment = await FeeInstallment.findOne({
      where: { id: installment_id },
      include: [
        {
          model: StudentFee,
          as: 'studentFee',
          where: { student_id: student.id },
          include: [
            {
              model: FeeStructure,
              as: 'feeStructure',
              attributes: ['name', 'late_fee_amount', 'late_fee_type']
            }
          ]
        }
      ]
    });

    if (!installment) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Installment not found or does not belong to this student"
      });
    }

    // Check if already paid
    if (installment.status === 'paid') {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Installment is already paid"
      });
    }

    // Calculate remaining amount
    const remainingAmount = parseFloat(installment.amount) - parseFloat(installment.paid_amount);

    // Calculate late fee if overdue
    const currentDate = new Date();
    const dueDate = new Date(installment.due_date);
    let lateFee = 0;

    if (currentDate > dueDate && remainingAmount > 0) {
      const feeStructure = installment.studentFee.feeStructure;
      if (feeStructure.late_fee_type === 'percentage') {
        lateFee = (remainingAmount * parseFloat(feeStructure.late_fee_amount)) / 100;
      } else {
        lateFee = parseFloat(feeStructure.late_fee_amount);
      }
    }

    const totalAmount = remainingAmount + lateFee;

    // Create Razorpay order
    const options = {
      amount: Math.round(totalAmount * 100), // amount in paise
      currency: "INR",
      receipt: `inst_${installment_id}_${Date.now()}`,
      notes: {
        student_id: student.id,
        installment_id: installment_id,
        student_name: student.User?.name || 'Student',
        roll_number: student.roll_number,
        fee_structure: installment.studentFee.feeStructure.name
      }
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Payment order created successfully",
      data: {
        order_id: order.id,
        amount: totalAmount,
        installment_amount: remainingAmount,
        late_fee: lateFee,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        installment_details: {
          installment_id: installment.id,
          installment_number: installment.installment_number,
          due_date: installment.due_date,
          fee_structure_name: installment.studentFee.feeStructure.name
        }
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Error creating payment order",
      error: error.message
    });
  }
};

// Verify payment and update records
const verifyInstallmentPayment = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      installment_id
    } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !installment_id) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Payment details are incomplete"
      });
    }

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Invalid payment signature"
      });
    }

    // Find student
    const student = await Student.findOne({
      where: { user_id: user_id },
      attributes: ['id', 'user_id', 'roll_number'],
      include: [
        {
          model: User,
          attributes: ['name']
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

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    // Get installment details
    const installment = await FeeInstallment.findOne({
      where: { id: installment_id },
      include: [
        {
          model: StudentFee,
          as: 'studentFee',
          where: { student_id: student.id },
          attributes: ['academic_year']
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

    const amountPaidInRupees = payment.amount / 100;
    const remainingAmount = parseFloat(installment.amount) - parseFloat(installment.paid_amount);
    const lateFee = amountPaidInRupees - remainingAmount;

    // Generate receipt number
    const receiptNumber = `REC${Date.now()}${student.id}`;

    // Start transaction-like updates
    try {
      // 1. Update FeeInstallment table
      const newPaidAmount = parseFloat(installment.paid_amount) + remainingAmount;
      await installment.update({
        paid_amount: newPaidAmount,
        payment_date: new Date(),
        late_fee_applied: lateFee > 0 ? lateFee : 0,
        status: newPaidAmount >= parseFloat(installment.amount) ? 'paid' : 'pending'
      });

      // 2. Create entry in FeePayment table
      const feePayment = await FeePayment.create({
        student_id: student.id,
        academic_year: installment.studentFee.academic_year,
        payment_date: new Date(),
        amount_paid: remainingAmount,
        late_fee_paid: lateFee > 0 ? lateFee : 0,
        total_paid: amountPaidInRupees,
        payment_method: 'online',
        transaction_id: razorpay_payment_id,
        receipt_number: receiptNumber,
        payment_type: 'fee',
        payment_status: 'success',
        is_refund: false,
        remarks: `Payment for installment #${installment.installment_number} via Razorpay`
      });

      // 3. Create entry in IncomeExpense table
      await IncomeExpense.create({
        entry_type: 'income',
        category: 'Fee',
        sub_category: `Installment Payment - ${student.roll_number}`,
        amount: amountPaidInRupees,
        payment_mode: 'online',
        transaction_ref: razorpay_payment_id,
        description: `Fee payment from ${student.User?.name || 'Student'} (Roll: ${student.roll_number}) - Installment #${installment.installment_number}`,
        entry_date: new Date(),
        recorded_by: `Student (ID: ${student.id})`
      });

      return res.status(200).json({
        success: true,
        statusCode: 200,
        message: "Payment verified and recorded successfully",
        data: {
          payment_id: feePayment.id,
          receipt_number: receiptNumber,
          transaction_id: razorpay_payment_id,
          amount_paid: remainingAmount,
          late_fee_paid: lateFee > 0 ? lateFee : 0,
          total_paid: amountPaidInRupees,
          payment_date: new Date(),
          installment_status: newPaidAmount >= parseFloat(installment.amount) ? 'paid' : 'pending'
        }
      });

    } catch (dbError) {
      console.error('Database update error:', dbError);
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Payment verified but failed to update records",
        error: dbError.message
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Payment verification failed",
      error: error.message
    });
  }
};

module.exports = {
  getStudentFeeDetails,
  getStudentInstallments,
  getStudentPaymentHistory,
  createInstallmentPaymentOrder,
  verifyInstallmentPayment
};
